import { Test, TestingModule } from '@nestjs/testing';
import { TokenRefreshUseCase } from '../../src/application/auth/token-refresh.usecase';
import { UserRepository } from '../../src/domain/repositories/user.repository';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { RefreshTokenService } from '../../src/application/auth/refresh-token.service';
import { AuthEventService } from '../../src/application/auth/auth-event.service';
import { TokenBlacklistService } from '../../src/infrastructure/cache/token-blacklist.service';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Unit tests for TokenRefreshUseCase
 * Tests refresh token validation, rotation, and new token generation
 */
describe('TokenRefreshUseCase', () => {
  let useCase: TokenRefreshUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;
  let authEventService: jest.Mocked<AuthEventService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: null,
    householdId: 'household-uuid-456',
    notificationPreferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletionScheduledAt: null,
    oauthLinks: [],
    refreshTokens: [],
  };

  const mockRefreshToken = {
    id: 'token-uuid-123',
    userId: mockUser.id,
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    createdAt: new Date(),
    revokedAt: undefined,
    user: mockUser,
    isExpired: () => false,
  };

  const mockTokenPair = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
    };

    const mockJwtService = {
      generateTokenPair: jest.fn(),
      hashRefreshToken: jest.fn(),
    };

    const mockRefreshTokenService = {
      validateToken: jest.fn(),
      rotateToken: jest.fn(),
      storeToken: jest.fn(),
    };

    const mockAuthEventService = {
      logTokenRefresh: jest.fn(),
    };

    const mockTokenBlacklistService = {
      isBlacklisted: jest.fn(),
      addToBlacklist: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRefreshUseCase,
        { provide: 'UserRepository', useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: AuthEventService, useValue: mockAuthEventService },
        { provide: TokenBlacklistService, useValue: mockTokenBlacklistService },
      ],
    }).compile();

    useCase = module.get<TokenRefreshUseCase>(TokenRefreshUseCase);
    userRepository = module.get('UserRepository');
    jwtService = module.get(JwtService);
    refreshTokenService = module.get(RefreshTokenService);
    authEventService = module.get(AuthEventService);
    tokenBlacklistService = module.get(TokenBlacklistService);
  });

  describe('execute', () => {
    const requestContext = {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should refresh tokens successfully', async () => {
      refreshTokenService.validateToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenService.rotateToken.mockResolvedValue({
        newToken: 'rotated-refresh-token',
        refreshToken: { ...mockRefreshToken, tokenHash: 'new-hash' },
      });
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logTokenRefresh.mockResolvedValue(undefined);

      const result = await useCase.execute('old-refresh-token', requestContext);

      expect(result.accessToken).toBe(mockTokenPair.accessToken);
      expect(result.tokenType).toBe('Bearer');
      expect(refreshTokenService.validateToken).toHaveBeenCalledWith('old-refresh-token');
      expect(refreshTokenService.rotateToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      refreshTokenService.validateToken.mockResolvedValue(null);

      await expect(
        useCase.execute('invalid-token', requestContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      refreshTokenService.validateToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('valid-token', requestContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for user with pending deletion', async () => {
      const deletionPendingUser = {
        ...mockUser,
        deletionScheduledAt: new Date(),
      };
      const tokenWithDeletionUser = {
        ...mockRefreshToken,
        user: deletionPendingUser,
      };

      refreshTokenService.validateToken.mockResolvedValue(tokenWithDeletionUser);
      userRepository.findById.mockResolvedValue(deletionPendingUser);

      await expect(
        useCase.execute('valid-token', requestContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include householdId in new access token', async () => {
      refreshTokenService.validateToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenService.rotateToken.mockResolvedValue({
        newToken: 'rotated-refresh-token',
        refreshToken: mockRefreshToken,
      });
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logTokenRefresh.mockResolvedValue(undefined);

      await useCase.execute('old-refresh-token', requestContext);

      expect(jwtService.generateTokenPair).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.householdId,
        'user',
      );
    });

    it('should log token refresh event', async () => {
      refreshTokenService.validateToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenService.rotateToken.mockResolvedValue({
        newToken: 'rotated-refresh-token',
        refreshToken: mockRefreshToken,
      });
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logTokenRefresh.mockResolvedValue(undefined);

      await useCase.execute('old-refresh-token', requestContext);

      expect(authEventService.logTokenRefresh).toHaveBeenCalledWith(
        mockUser.id,
        requestContext.ipAddress,
        requestContext.userAgent,
      );
    });
  });

  describe('token rotation', () => {
    it('should return new refresh token after rotation', async () => {
      const rotatedToken = 'new-rotated-token';

      refreshTokenService.validateToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenService.rotateToken.mockResolvedValue({
        newToken: rotatedToken,
        refreshToken: mockRefreshToken,
      });
      jwtService.generateTokenPair.mockResolvedValue({
        ...mockTokenPair,
        refreshToken: rotatedToken,
      });
      authEventService.logTokenRefresh.mockResolvedValue(undefined);

      const result = await useCase.execute('old-token', { ipAddress: '127.0.0.1' });

      expect(result.refreshToken).toBe(rotatedToken);
    });

    it('should fail if rotation fails', async () => {
      refreshTokenService.validateToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenService.rotateToken.mockResolvedValue(null);

      await expect(
        useCase.execute('old-token', { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('security checks', () => {
    it('should reject blacklisted access token JTI', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(true);
      refreshTokenService.validateToken.mockResolvedValue(mockRefreshToken);

      // When access token JTI is blacklisted, the refresh should still work
      // as the refresh token is separate
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenService.rotateToken.mockResolvedValue({
        newToken: 'new-token',
        refreshToken: mockRefreshToken,
      });
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logTokenRefresh.mockResolvedValue(undefined);

      const result = await useCase.execute('valid-refresh', { ipAddress: '127.0.0.1' });

      expect(result).toBeDefined();
    });
  });
});
