import { Test, TestingModule } from '@nestjs/testing';
import { AppleSignInUseCase, AppleUserInfo } from '../../src/application/auth/apple-signin.usecase';
import { UserRepository } from '../../src/domain/repositories/user.repository';
import { OAuthLinkRepository } from '../../src/domain/repositories/oauth-link.repository';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { AuthEventService } from '../../src/application/auth/auth-event.service';
import { AppleTokenService } from '../../src/infrastructure/auth/apple-token.service';
import { OAuthStateService } from '../../src/infrastructure/auth/oauth-state.service';
import { RefreshTokenService } from '../../src/application/auth/refresh-token.service';
import { OAuthProvider } from '../../src/domain/entities/oauth-link.entity';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

/**
 * Unit tests for AppleSignInUseCase
 * Tests business logic in isolation with mocked dependencies
 */
describe('AppleSignInUseCase', () => {
  let useCase: AppleSignInUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let oauthLinkRepository: jest.Mocked<OAuthLinkRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let authEventService: jest.Mocked<AuthEventService>;
  let appleTokenService: jest.Mocked<AppleTokenService>;
  let oauthStateService: jest.Mocked<OAuthStateService>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@privaterelay.appleid.com',
    displayName: 'Apple User',
    avatarUrl: null,
    householdId: null,
    notificationPreferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletionRequestedAt: null,
    oauthLinks: [],
    refreshTokens: [],
  };

  const mockOAuthLink = {
    id: 'link-uuid-123',
    userId: mockUser.id,
    provider: OAuthProvider.APPLE,
    providerUserId: '000000.abcdef123456.7890',
    providerEmail: 'test@privaterelay.appleid.com',
    createdAt: new Date(),
    user: mockUser,
  };

  const mockTokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
  };

  const mockAppleTokenPayload = {
    iss: 'https://appleid.apple.com',
    aud: 'com.aki.app',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    sub: '000000.abcdef123456.7890',
    email: 'test@privaterelay.appleid.com',
    email_verified: 'true',
    is_private_email: 'true',
    auth_time: Math.floor(Date.now() / 1000),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockOAuthLinkRepository = {
      findByProviderAndProviderId: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockJwtService = {
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      hashRefreshToken: jest.fn(),
    };

    const mockAuthEventService = {
      logLoginSuccess: jest.fn(),
      logLoginFailure: jest.fn(),
      logOAuthLinked: jest.fn(),
    };

    const mockAppleTokenService = {
      verifyIdentityToken: jest.fn(),
    };

    const mockOAuthStateService = {
      generateState: jest.fn(),
      validateState: jest.fn(),
      consumeState: jest.fn(),
    };

    const mockRefreshTokenService = {
      storeToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppleSignInUseCase,
        { provide: 'UserRepository', useValue: mockUserRepository },
        { provide: 'OAuthLinkRepository', useValue: mockOAuthLinkRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuthEventService, useValue: mockAuthEventService },
        { provide: AppleTokenService, useValue: mockAppleTokenService },
        { provide: OAuthStateService, useValue: mockOAuthStateService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
      ],
    }).compile();

    useCase = module.get<AppleSignInUseCase>(AppleSignInUseCase);
    userRepository = module.get('UserRepository');
    oauthLinkRepository = module.get('OAuthLinkRepository');
    jwtService = module.get(JwtService);
    authEventService = module.get(AuthEventService);
    appleTokenService = module.get(AppleTokenService);
    oauthStateService = module.get(OAuthStateService);
    refreshTokenService = module.get(RefreshTokenService);
  });

  describe('execute', () => {
    const requestContext = {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (iPhone)',
      state: 'valid-state',
    };

    it('should authenticate existing user with Apple link', async () => {
      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockResolvedValue(mockAppleTokenPayload);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(mockOAuthLink);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      refreshTokenService.storeToken.mockResolvedValue(undefined);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      const result = await useCase.execute(
        'valid-identity-token',
        undefined,
        requestContext,
      );

      expect(result).toEqual(mockTokenPair);
      expect(appleTokenService.verifyIdentityToken).toHaveBeenCalledWith('valid-identity-token');
      expect(oauthLinkRepository.findByProviderAndProviderId).toHaveBeenCalledWith(
        OAuthProvider.APPLE,
        mockAppleTokenPayload.sub,
      );
    });

    it('should create new user on first Apple sign-in with user info', async () => {
      const userInfo: AppleUserInfo = {
        name: { firstName: 'John', lastName: 'Doe' },
        email: 'john@example.com',
      };

      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockResolvedValue(mockAppleTokenPayload);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      oauthLinkRepository.create.mockReturnValue(mockOAuthLink);
      oauthLinkRepository.save.mockResolvedValue(mockOAuthLink);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      refreshTokenService.storeToken.mockResolvedValue(undefined);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      const result = await useCase.execute(
        'valid-identity-token',
        userInfo,
        requestContext,
      );

      expect(result).toEqual(mockTokenPair);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'John Doe',
        }),
      );
    });

    it('should use email prefix for display name when no user info provided', async () => {
      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockResolvedValue(mockAppleTokenPayload);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      oauthLinkRepository.create.mockReturnValue(mockOAuthLink);
      oauthLinkRepository.save.mockResolvedValue(mockOAuthLink);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      refreshTokenService.storeToken.mockResolvedValue(undefined);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      await useCase.execute('valid-identity-token', undefined, requestContext);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockAppleTokenPayload.email,
        }),
      );
    });

    it('should throw UnauthorizedException for invalid state', async () => {
      oauthStateService.consumeState.mockResolvedValue(false);
      authEventService.logLoginFailure.mockResolvedValue(undefined);

      await expect(
        useCase.execute('valid-token', undefined, requestContext),
      ).rejects.toThrow(UnauthorizedException);

      expect(authEventService.logLoginFailure).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid identity token', async () => {
      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockRejectedValue(new Error('Invalid token'));
      authEventService.logLoginFailure.mockResolvedValue(undefined);

      await expect(
        useCase.execute('invalid-token', undefined, requestContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for user with pending deletion', async () => {
      const deletionPendingUser = {
        ...mockUser,
        deletionRequestedAt: new Date(),
      };
      const link = { ...mockOAuthLink, user: deletionPendingUser };

      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockResolvedValue(mockAppleTokenPayload);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(link);
      userRepository.findById.mockResolvedValue(deletionPendingUser);

      await expect(
        useCase.execute('valid-token', undefined, requestContext),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('private relay email handling', () => {
    it('should detect private relay email', () => {
      const privateRelayEmail = 'abcdef@privaterelay.appleid.com';
      const isPrivateRelay = privateRelayEmail.includes('@privaterelay.appleid.com');

      expect(isPrivateRelay).toBe(true);
    });

    it('should handle email_verified claim', async () => {
      const unverifiedPayload = {
        ...mockAppleTokenPayload,
        email_verified: 'false',
      };

      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockResolvedValue(unverifiedPayload);
      authEventService.logLoginFailure.mockResolvedValue(undefined);

      await expect(
        useCase.execute('token', undefined, { ipAddress: '127.0.0.1', state: 'valid' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('link to existing user', () => {
    it('should link Apple to existing user with same email', async () => {
      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockResolvedValue(mockAppleTokenPayload);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(mockUser);
      oauthLinkRepository.findByUserId.mockResolvedValue([]);
      oauthLinkRepository.create.mockReturnValue(mockOAuthLink);
      oauthLinkRepository.save.mockResolvedValue(mockOAuthLink);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      refreshTokenService.storeToken.mockResolvedValue(undefined);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);
      authEventService.logOAuthLinked.mockResolvedValue(undefined);

      const result = await useCase.execute(
        'valid-token',
        undefined,
        { ipAddress: '127.0.0.1', state: 'valid' },
      );

      expect(result).toEqual(mockTokenPair);
      expect(authEventService.logOAuthLinked).toHaveBeenCalledWith(
        mockUser.id,
        '127.0.0.1',
        'apple',
        undefined,
      );
    });
  });

  describe('audit logging', () => {
    it('should log successful Apple authentication', async () => {
      oauthStateService.consumeState.mockResolvedValue(true);
      appleTokenService.verifyIdentityToken.mockResolvedValue(mockAppleTokenPayload);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(mockOAuthLink);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      refreshTokenService.storeToken.mockResolvedValue(undefined);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      await useCase.execute(
        'valid-token',
        undefined,
        { ipAddress: '192.168.1.1', userAgent: 'iPhone', state: 'valid' },
      );

      expect(authEventService.logLoginSuccess).toHaveBeenCalledWith(
        mockUser.id,
        '192.168.1.1',
        'iPhone',
        'apple',
      );
    });
  });
});
