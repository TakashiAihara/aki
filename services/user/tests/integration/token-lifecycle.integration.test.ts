import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../src/domain/entities/user.entity';
import { RefreshToken } from '../../src/domain/entities/refresh-token.entity';
import { AuthEvent } from '../../src/domain/entities/auth-event.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { RefreshTokenService } from '../../src/application/auth/refresh-token.service';

/**
 * Integration tests for token lifecycle
 * Tests complete token refresh, rotation, and revocation flows
 */
describe('Token Lifecycle Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let authEventRepository: Repository<AuthEvent>;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = moduleFixture.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    authEventRepository = moduleFixture.get<Repository<AuthEvent>>(
      getRepositoryToken(AuthEvent),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);
    refreshTokenService = moduleFixture.get<RefreshTokenService>(RefreshTokenService);
  });

  beforeEach(async () => {
    await authEventRepository.delete({});
    await refreshTokenRepository.delete({});
    await userRepository.delete({});
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await app?.close();
  });

  describe('Token Generation and Storage', () => {
    it('should generate token pair and store refresh token hash', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      const tokenPair = await jwtService.generateTokenPair(
        user.id,
        user.email,
        undefined,
        'user',
      );

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.tokenType).toBe('Bearer');
      expect(tokenPair.expiresIn).toBeGreaterThan(0);

      // Store refresh token
      const storedToken = await refreshTokenService.storeToken(
        user.id,
        tokenPair.refreshToken,
        '127.0.0.1',
        'Test Agent',
      );

      expect(storedToken.userId).toBe(user.id);
      expect(storedToken.tokenHash).toBeDefined();
      expect(storedToken.tokenHash.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('should store refresh token hash, not plaintext', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      const tokenPair = await jwtService.generateTokenPair(
        user.id,
        user.email,
      );

      await refreshTokenService.storeToken(
        user.id,
        tokenPair.refreshToken,
        '127.0.0.1',
      );

      // Verify plaintext token is not stored
      const storedTokens = await refreshTokenRepository.find({
        where: { userId: user.id },
      });

      expect(storedTokens).toHaveLength(1);
      expect(storedTokens[0].tokenHash).not.toBe(tokenPair.refreshToken);
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid refresh token', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      const tokenPair = await jwtService.generateTokenPair(user.id, user.email);
      await refreshTokenService.storeToken(user.id, tokenPair.refreshToken, '127.0.0.1');

      const validatedToken = await refreshTokenService.validateToken(
        tokenPair.refreshToken,
      );

      expect(validatedToken).toBeDefined();
      expect(validatedToken?.userId).toBe(user.id);
    });

    it('should reject an invalid refresh token', async () => {
      const validatedToken = await refreshTokenService.validateToken(
        'invalid-token',
      );

      expect(validatedToken).toBeNull();
    });

    it('should reject an expired refresh token', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      // Create expired token directly in database
      const tokenHash = jwtService.hashRefreshToken('expired-token');
      const expiredToken = refreshTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
        deviceInfo: { ipAddress: '127.0.0.1' },
      });
      await refreshTokenRepository.save(expiredToken);

      const validatedToken = await refreshTokenService.validateToken('expired-token');

      expect(validatedToken).toBeNull();
    });

    it('should reject a revoked refresh token', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      const tokenPair = await jwtService.generateTokenPair(user.id, user.email);
      await refreshTokenService.storeToken(user.id, tokenPair.refreshToken, '127.0.0.1');

      // Revoke the token
      await refreshTokenService.revokeToken(tokenPair.refreshToken);

      const validatedToken = await refreshTokenService.validateToken(
        tokenPair.refreshToken,
      );

      expect(validatedToken).toBeNull();
    });
  });

  describe('Token Rotation', () => {
    it('should rotate refresh token and invalidate old one', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      const tokenPair = await jwtService.generateTokenPair(user.id, user.email);
      await refreshTokenService.storeToken(user.id, tokenPair.refreshToken, '127.0.0.1');

      // Rotate token
      const rotationResult = await refreshTokenService.rotateToken(
        tokenPair.refreshToken,
        user.id,
        '127.0.0.1',
        'Test Agent',
      );

      expect(rotationResult).toBeDefined();
      expect(rotationResult?.newToken).toBeDefined();
      expect(rotationResult?.newToken).not.toBe(tokenPair.refreshToken);

      // Old token should be invalid
      const oldTokenValidation = await refreshTokenService.validateToken(
        tokenPair.refreshToken,
      );
      expect(oldTokenValidation).toBeNull();

      // New token should be valid
      const newTokenValidation = await refreshTokenService.validateToken(
        rotationResult!.newToken,
      );
      expect(newTokenValidation).toBeDefined();
    });
  });

  describe('Token Revocation', () => {
    it('should revoke a single refresh token', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      const tokenPair = await jwtService.generateTokenPair(user.id, user.email);
      await refreshTokenService.storeToken(user.id, tokenPair.refreshToken, '127.0.0.1');

      const revoked = await refreshTokenService.revokeToken(tokenPair.refreshToken);

      expect(revoked).toBe(true);

      // Token should now be invalid
      const validatedToken = await refreshTokenService.validateToken(
        tokenPair.refreshToken,
      );
      expect(validatedToken).toBeNull();
    });

    it('should revoke all user tokens', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      // Create multiple tokens
      const token1 = await jwtService.generateTokenPair(user.id, user.email);
      const token2 = await jwtService.generateTokenPair(user.id, user.email);
      const token3 = await jwtService.generateTokenPair(user.id, user.email);

      await refreshTokenService.storeToken(user.id, token1.refreshToken, '127.0.0.1');
      await refreshTokenService.storeToken(user.id, token2.refreshToken, '127.0.0.2');
      await refreshTokenService.storeToken(user.id, token3.refreshToken, '127.0.0.3');

      const revokedCount = await refreshTokenService.revokeAllUserTokens(user.id);

      expect(revokedCount).toBe(3);

      // All tokens should now be invalid
      expect(await refreshTokenService.validateToken(token1.refreshToken)).toBeNull();
      expect(await refreshTokenService.validateToken(token2.refreshToken)).toBeNull();
      expect(await refreshTokenService.validateToken(token3.refreshToken)).toBeNull();
    });
  });

  describe('Active Sessions', () => {
    it('should list active tokens for a user', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      const token1 = await jwtService.generateTokenPair(user.id, user.email);
      const token2 = await jwtService.generateTokenPair(user.id, user.email);

      await refreshTokenService.storeToken(user.id, token1.refreshToken, '127.0.0.1', 'Chrome');
      await refreshTokenService.storeToken(user.id, token2.refreshToken, '127.0.0.2', 'Safari');

      const activeTokens = await refreshTokenService.getActiveTokensForUser(user.id);

      expect(activeTokens).toHaveLength(2);
      expect(activeTokens.map(t => t.deviceInfo.userAgent)).toContain('Chrome');
      expect(activeTokens.map(t => t.deviceInfo.userAgent)).toContain('Safari');
    });
  });

  describe('Token Cleanup', () => {
    it('should clean up expired tokens', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      // Create expired token directly
      const expiredTokenHash = jwtService.hashRefreshToken('expired-token');
      await refreshTokenRepository.save(
        refreshTokenRepository.create({
          userId: user.id,
          tokenHash: expiredTokenHash,
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          deviceInfo: { ipAddress: '127.0.0.1' },
        }),
      );

      // Create valid token
      const validToken = await jwtService.generateTokenPair(user.id, user.email);
      await refreshTokenService.storeToken(user.id, validToken.refreshToken, '127.0.0.1');

      const cleanedCount = await refreshTokenService.cleanupExpiredTokens();

      expect(cleanedCount).toBeGreaterThan(0);

      // Valid token should still exist
      const activeTokens = await refreshTokenService.getActiveTokensForUser(user.id);
      expect(activeTokens).toHaveLength(1);
    });
  });
});
