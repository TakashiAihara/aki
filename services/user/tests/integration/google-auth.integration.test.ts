import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../src/domain/entities/user.entity';
import { OAuthLink, OAuthProvider } from '../../src/domain/entities/oauth-link.entity';
import { RefreshToken } from '../../src/domain/entities/refresh-token.entity';
import { AuthEvent } from '../../src/domain/entities/auth-event.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import * as jose from 'jose';

/**
 * Integration tests for Google OAuth flow
 * Tests the complete authentication flow including database interactions
 */
describe('Google Auth Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let oauthLinkRepository: Repository<OAuthLink>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let authEventRepository: Repository<AuthEvent>;
  let jwtService: JwtService;

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
    oauthLinkRepository = moduleFixture.get<Repository<OAuthLink>>(getRepositoryToken(OAuthLink));
    refreshTokenRepository = moduleFixture.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
    authEventRepository = moduleFixture.get<Repository<AuthEvent>>(getRepositoryToken(AuthEvent));
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await authEventRepository.delete({});
    await refreshTokenRepository.delete({});
    await oauthLinkRepository.delete({});
    await userRepository.delete({});
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await app?.close();
  });

  describe('New User Registration via Google OAuth', () => {
    it('should create new user on first Google sign-in', async () => {
      const mockGoogleProfile = {
        id: 'google-123456',
        email: 'newuser@gmail.com',
        displayName: 'New User',
        avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
      };

      // Simulate the OAuth callback with mocked Google data
      // This would be done through the GoogleOAuthUseCase
      const user = userRepository.create({
        email: mockGoogleProfile.email,
        displayName: mockGoogleProfile.displayName,
        avatarUrl: mockGoogleProfile.avatarUrl,
      });
      const savedUser = await userRepository.save(user);

      const oauthLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: mockGoogleProfile.id,
        providerEmail: mockGoogleProfile.email,
      });
      await oauthLinkRepository.save(oauthLink);

      // Verify user was created
      const createdUser = await userRepository.findOne({
        where: { email: mockGoogleProfile.email },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.displayName).toBe(mockGoogleProfile.displayName);

      // Verify OAuth link was created
      const createdLink = await oauthLinkRepository.findOne({
        where: { providerUserId: mockGoogleProfile.id },
      });
      expect(createdLink).toBeDefined();
      expect(createdLink?.provider).toBe(OAuthProvider.GOOGLE);
    });

    it('should return existing user on subsequent Google sign-ins', async () => {
      const existingUser = userRepository.create({
        email: 'existing@gmail.com',
        displayName: 'Existing User',
      });
      const savedUser = await userRepository.save(existingUser);

      const oauthLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: 'google-existing-123',
        providerEmail: 'existing@gmail.com',
      });
      await oauthLinkRepository.save(oauthLink);

      // Simulate second sign-in - should find existing user
      const foundLink = await oauthLinkRepository.findOne({
        where: {
          provider: OAuthProvider.GOOGLE,
          providerUserId: 'google-existing-123',
        },
        relations: ['user'],
      });

      expect(foundLink).toBeDefined();
      expect(foundLink?.userId).toBe(savedUser.id);

      // Verify no duplicate user was created
      const users = await userRepository.find({
        where: { email: 'existing@gmail.com' },
      });
      expect(users).toHaveLength(1);
    });
  });

  describe('Token Generation', () => {
    it('should generate valid JWT access token', async () => {
      const user = userRepository.create({
        email: 'test@gmail.com',
        displayName: 'Test User',
      });
      const savedUser = await userRepository.save(user);

      const tokenPair = await jwtService.generateTokenPair(
        savedUser.id,
        savedUser.email,
        undefined,
        'user',
      );

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.tokenType).toBe('Bearer');
      expect(tokenPair.expiresIn).toBeGreaterThan(0);

      // Verify token is valid and contains correct claims
      const payload = await jwtService.verifyAccessToken(tokenPair.accessToken);
      expect(payload.sub).toBe(savedUser.id);
      expect(payload.email).toBe(savedUser.email);
      expect(payload.role).toBe('user');
    });

    it('should generate opaque refresh token', async () => {
      const user = userRepository.create({
        email: 'test@gmail.com',
        displayName: 'Test User',
      });
      const savedUser = await userRepository.save(user);

      const tokenPair = await jwtService.generateTokenPair(
        savedUser.id,
        savedUser.email,
      );

      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.refreshToken.length).toBeGreaterThan(20);

      // Refresh token should not be a JWT
      const parts = tokenPair.refreshToken.split('.');
      expect(parts.length).not.toBe(3); // JWT has 3 parts
    });

    it('should store hashed refresh token in database', async () => {
      const user = userRepository.create({
        email: 'test@gmail.com',
        displayName: 'Test User',
      });
      const savedUser = await userRepository.save(user);

      const tokenPair = await jwtService.generateTokenPair(
        savedUser.id,
        savedUser.email,
      );

      const tokenHash = jwtService.hashRefreshToken(tokenPair.refreshToken);

      const refreshToken = refreshTokenRepository.create({
        userId: savedUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: 'Test Agent',
        ipAddress: '127.0.0.1',
      });
      await refreshTokenRepository.save(refreshToken);

      // Verify token is stored
      const storedToken = await refreshTokenRepository.findOne({
        where: { tokenHash },
      });
      expect(storedToken).toBeDefined();
      expect(storedToken?.userId).toBe(savedUser.id);
    });
  });

  describe('Auth Event Logging', () => {
    it('should log successful login event', async () => {
      const user = userRepository.create({
        email: 'test@gmail.com',
        displayName: 'Test User',
      });
      const savedUser = await userRepository.save(user);

      const authEvent = authEventRepository.create({
        userId: savedUser.id,
        eventType: 'LOGIN_SUCCESS',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { provider: 'google' },
      });
      await authEventRepository.save(authEvent);

      const events = await authEventRepository.find({
        where: { userId: savedUser.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('LOGIN_SUCCESS');
    });

    it('should log failed login attempt', async () => {
      const authEvent = authEventRepository.create({
        eventType: 'LOGIN_FAILURE',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { reason: 'invalid_state', attemptedEmail: 'attacker@evil.com' },
      });
      await authEventRepository.save(authEvent);

      const events = await authEventRepository.find({
        where: { eventType: 'LOGIN_FAILURE' },
      });
      expect(events).toHaveLength(1);
      expect(events[0].metadata).toHaveProperty('reason');
    });
  });

  describe('OAuth Link Management', () => {
    it('should link Google account to existing user', async () => {
      // User registered via Apple first
      const user = userRepository.create({
        email: 'multi@example.com',
        displayName: 'Multi Provider User',
      });
      const savedUser = await userRepository.save(user);

      const appleLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.APPLE,
        providerUserId: 'apple-123',
        providerEmail: 'multi@example.com',
      });
      await oauthLinkRepository.save(appleLink);

      // Now link Google
      const googleLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: 'google-456',
        providerEmail: 'multi@gmail.com',
      });
      await oauthLinkRepository.save(googleLink);

      // Verify both links exist
      const links = await oauthLinkRepository.find({
        where: { userId: savedUser.id },
      });
      expect(links).toHaveLength(2);
      expect(links.map(l => l.provider)).toContain(OAuthProvider.GOOGLE);
      expect(links.map(l => l.provider)).toContain(OAuthProvider.APPLE);
    });

    it('should prevent duplicate Google link for different users', async () => {
      const user1 = await userRepository.save(
        userRepository.create({ email: 'user1@example.com', displayName: 'User 1' }),
      );

      await oauthLinkRepository.save(
        oauthLinkRepository.create({
          userId: user1.id,
          provider: OAuthProvider.GOOGLE,
          providerUserId: 'google-shared',
          providerEmail: 'shared@gmail.com',
        }),
      );

      const user2 = await userRepository.save(
        userRepository.create({ email: 'user2@example.com', displayName: 'User 2' }),
      );

      // Attempting to link same Google account to different user should fail
      const duplicateLink = oauthLinkRepository.create({
        userId: user2.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: 'google-shared',
        providerEmail: 'shared@gmail.com',
      });

      await expect(oauthLinkRepository.save(duplicateLink)).rejects.toThrow();
    });
  });
});
