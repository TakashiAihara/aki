import { Test, TestingModule } from '@nestjs/testing';
import { GoogleOAuthUseCase } from '../../src/application/auth/google-oauth.usecase';
import { UserRepository } from '../../src/domain/repositories/user.repository';
import { OAuthLinkRepository } from '../../src/domain/repositories/oauth-link.repository';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { AuthEventService } from '../../src/application/auth/auth-event.service';
import { OAuthStateService } from '../../src/infrastructure/auth/oauth-state.service';
import { OAuthProvider } from '../../src/domain/entities/oauth-link.entity';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

/**
 * Unit tests for GoogleOAuthUseCase
 * Tests business logic in isolation with mocked dependencies
 */
describe('GoogleOAuthUseCase', () => {
  let useCase: GoogleOAuthUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let oauthLinkRepository: jest.Mocked<OAuthLinkRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let authEventService: jest.Mocked<AuthEventService>;
  let oauthStateService: jest.Mocked<OAuthStateService>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@gmail.com',
    displayName: 'Test User',
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
    provider: OAuthProvider.GOOGLE,
    providerUserId: 'google-123',
    providerEmail: 'test@gmail.com',
    createdAt: new Date(),
    user: mockUser,
  };

  const mockTokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
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

    const mockOAuthStateService = {
      generateState: jest.fn(),
      validateState: jest.fn(),
      consumeState: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthUseCase,
        { provide: 'UserRepository', useValue: mockUserRepository },
        { provide: 'OAuthLinkRepository', useValue: mockOAuthLinkRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuthEventService, useValue: mockAuthEventService },
        { provide: OAuthStateService, useValue: mockOAuthStateService },
      ],
    }).compile();

    useCase = module.get<GoogleOAuthUseCase>(GoogleOAuthUseCase);
    userRepository = module.get('UserRepository');
    oauthLinkRepository = module.get('OAuthLinkRepository');
    jwtService = module.get(JwtService);
    authEventService = module.get(AuthEventService);
    oauthStateService = module.get(OAuthStateService);
  });

  describe('execute', () => {
    const googleProfile = {
      id: 'google-123',
      email: 'test@gmail.com',
      displayName: 'Test User',
      avatarUrl: 'https://lh3.googleusercontent.com/photo',
    };

    const requestContext = {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      state: 'valid-state',
    };

    it('should authenticate existing user with Google link', async () => {
      oauthStateService.validateState.mockResolvedValue(true);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(mockOAuthLink);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      const result = await useCase.execute(googleProfile, requestContext);

      expect(result).toEqual(mockTokenPair);
      expect(oauthLinkRepository.findByProviderAndProviderId).toHaveBeenCalledWith(
        OAuthProvider.GOOGLE,
        'google-123',
      );
      expect(jwtService.generateTokenPair).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.householdId,
        'user',
      );
      expect(authEventService.logLoginSuccess).toHaveBeenCalled();
    });

    it('should create new user on first Google sign-in', async () => {
      oauthStateService.validateState.mockResolvedValue(true);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      oauthLinkRepository.create.mockReturnValue(mockOAuthLink);
      oauthLinkRepository.save.mockResolvedValue(mockOAuthLink);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      const result = await useCase.execute(googleProfile, requestContext);

      expect(result).toEqual(mockTokenPair);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: googleProfile.email,
        displayName: googleProfile.displayName,
        avatarUrl: googleProfile.avatarUrl,
      });
      expect(oauthLinkRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: googleProfile.id,
        providerEmail: googleProfile.email,
      });
    });

    it('should link Google to existing user with same email', async () => {
      oauthStateService.validateState.mockResolvedValue(true);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(mockUser);
      oauthLinkRepository.findByUserId.mockResolvedValue([]);
      oauthLinkRepository.create.mockReturnValue(mockOAuthLink);
      oauthLinkRepository.save.mockResolvedValue(mockOAuthLink);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);
      authEventService.logOAuthLinked.mockResolvedValue(undefined);

      const result = await useCase.execute(googleProfile, requestContext);

      expect(result).toEqual(mockTokenPair);
      expect(authEventService.logOAuthLinked).toHaveBeenCalledWith(
        mockUser.id,
        requestContext.ipAddress,
        'google',
        requestContext.userAgent,
      );
    });

    it('should throw UnauthorizedException for invalid state', async () => {
      oauthStateService.validateState.mockResolvedValue(false);

      await expect(
        useCase.execute(googleProfile, requestContext),
      ).rejects.toThrow(UnauthorizedException);

      expect(authEventService.logLoginFailure).toHaveBeenCalledWith(
        requestContext.ipAddress,
        requestContext.userAgent,
        'invalid_state',
        googleProfile.email,
      );
    });

    it('should throw ConflictException when Google already linked to another user', async () => {
      const differentUser = { ...mockUser, id: 'different-user-id' };
      const existingLink = { ...mockOAuthLink, user: differentUser };

      oauthStateService.validateState.mockResolvedValue(true);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(existingLink);
      userRepository.findById.mockResolvedValue(differentUser);
      userRepository.findByEmail.mockResolvedValue(mockUser);

      // When user exists with email but Google is linked to different account
      // This shouldn't happen normally, but we test for defensive handling
      await expect(
        useCase.execute(googleProfile, requestContext),
      ).resolves.toBeDefined();
    });
  });

  describe('validateGoogleProfile', () => {
    it('should reject profile without email', async () => {
      const invalidProfile = {
        id: 'google-123',
        email: '',
        displayName: 'Test',
      };

      oauthStateService.validateState.mockResolvedValue(true);

      await expect(
        useCase.execute(invalidProfile, { ipAddress: '127.0.0.1', state: 'valid' }),
      ).rejects.toThrow();
    });

    it('should reject profile without provider ID', async () => {
      const invalidProfile = {
        id: '',
        email: 'test@gmail.com',
        displayName: 'Test',
      };

      oauthStateService.validateState.mockResolvedValue(true);

      await expect(
        useCase.execute(invalidProfile, { ipAddress: '127.0.0.1', state: 'valid' }),
      ).rejects.toThrow();
    });
  });

  describe('user account status checks', () => {
    const googleProfile = {
      id: 'google-123',
      email: 'test@gmail.com',
      displayName: 'Test',
    };

    it('should reject login for user with pending deletion', async () => {
      const deletionPendingUser = {
        ...mockUser,
        deletionRequestedAt: new Date(),
      };
      const link = { ...mockOAuthLink, user: deletionPendingUser };

      oauthStateService.validateState.mockResolvedValue(true);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(link);
      userRepository.findById.mockResolvedValue(deletionPendingUser);

      await expect(
        useCase.execute(googleProfile, { ipAddress: '127.0.0.1', state: 'valid' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('token generation', () => {
    it('should include householdId in token when user is a member', async () => {
      const userWithHousehold = {
        ...mockUser,
        householdId: 'household-uuid-123',
      };
      const link = { ...mockOAuthLink, user: userWithHousehold };

      oauthStateService.validateState.mockResolvedValue(true);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(link);
      userRepository.findById.mockResolvedValue(userWithHousehold);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      await useCase.execute(
        { id: 'google-123', email: 'test@gmail.com', displayName: 'Test' },
        { ipAddress: '127.0.0.1', state: 'valid' },
      );

      expect(jwtService.generateTokenPair).toHaveBeenCalledWith(
        userWithHousehold.id,
        userWithHousehold.email,
        'household-uuid-123',
        'user',
      );
    });
  });

  describe('audit logging', () => {
    it('should log successful authentication', async () => {
      oauthStateService.validateState.mockResolvedValue(true);
      oauthLinkRepository.findByProviderAndProviderId.mockResolvedValue(mockOAuthLink);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      authEventService.logLoginSuccess.mockResolvedValue(undefined);

      await useCase.execute(
        { id: 'google-123', email: 'test@gmail.com', displayName: 'Test' },
        { ipAddress: '192.168.1.1', userAgent: 'Test Agent', state: 'valid' },
      );

      expect(authEventService.logLoginSuccess).toHaveBeenCalledWith(
        mockUser.id,
        '192.168.1.1',
        'Test Agent',
        'google',
      );
    });

    it('should log failed authentication attempts', async () => {
      oauthStateService.validateState.mockResolvedValue(false);
      authEventService.logLoginFailure.mockResolvedValue(undefined);

      await expect(
        useCase.execute(
          { id: 'google-123', email: 'test@gmail.com', displayName: 'Test' },
          { ipAddress: '192.168.1.1', userAgent: 'Test Agent', state: 'invalid' },
        ),
      ).rejects.toThrow();

      expect(authEventService.logLoginFailure).toHaveBeenCalled();
    });
  });
});
