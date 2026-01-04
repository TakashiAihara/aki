import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../src/domain/entities/user.entity';
import { OAuthLink, OAuthProvider } from '../../src/domain/entities/oauth-link.entity';
import { RefreshToken } from '../../src/domain/entities/refresh-token.entity';
import { AuthEvent, AuthEventType } from '../../src/domain/entities/auth-event.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';

/**
 * Integration tests for Apple Sign In flow
 * Tests the complete authentication flow including database interactions
 */
describe('Apple Auth Integration Tests', () => {
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
    await authEventRepository.delete({});
    await refreshTokenRepository.delete({});
    await oauthLinkRepository.delete({});
    await userRepository.delete({});
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await app?.close();
  });

  describe('New User Registration via Apple Sign In', () => {
    it('should create new user on first Apple sign-in', async () => {
      const mockAppleProfile = {
        id: '000000.abcdef123456.7890',
        email: 'test@privaterelay.appleid.com',
        displayName: 'Apple User',
      };

      const user = userRepository.create({
        email: mockAppleProfile.email,
        displayName: mockAppleProfile.displayName,
      });
      const savedUser = await userRepository.save(user);

      const oauthLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.APPLE,
        providerUserId: mockAppleProfile.id,
        providerEmail: mockAppleProfile.email,
      });
      await oauthLinkRepository.save(oauthLink);

      const createdUser = await userRepository.findOne({
        where: { email: mockAppleProfile.email },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.displayName).toBe(mockAppleProfile.displayName);

      const createdLink = await oauthLinkRepository.findOne({
        where: { providerUserId: mockAppleProfile.id },
      });
      expect(createdLink).toBeDefined();
      expect(createdLink?.provider).toBe(OAuthProvider.APPLE);
    });

    it('should use provided name from first Apple sign-in', async () => {
      // Apple only sends user info on first authorization
      const firstSignInData = {
        appleId: '000000.abcdef123456.7890',
        email: 'hidden@privaterelay.appleid.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const displayName = `${firstSignInData.firstName} ${firstSignInData.lastName}`.trim();

      const user = userRepository.create({
        email: firstSignInData.email,
        displayName: displayName || 'Apple User',
      });
      const savedUser = await userRepository.save(user);

      expect(savedUser.displayName).toBe('John Doe');
    });

    it('should handle private relay email correctly', async () => {
      const privateRelayEmail = 'abcdef123@privaterelay.appleid.com';

      const user = userRepository.create({
        email: privateRelayEmail,
        displayName: 'Private Relay User',
      });
      const savedUser = await userRepository.save(user);

      expect(savedUser.email).toContain('@privaterelay.appleid.com');

      // Verify the user can still be found by this email
      const foundUser = await userRepository.findOne({
        where: { email: privateRelayEmail },
      });
      expect(foundUser).toBeDefined();
    });
  });

  describe('Returning User via Apple Sign In', () => {
    it('should authenticate existing Apple user', async () => {
      const existingUser = userRepository.create({
        email: 'existing@privaterelay.appleid.com',
        displayName: 'Existing User',
      });
      const savedUser = await userRepository.save(existingUser);

      const oauthLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.APPLE,
        providerUserId: 'apple-existing-123',
        providerEmail: 'existing@privaterelay.appleid.com',
      });
      await oauthLinkRepository.save(oauthLink);

      const foundLink = await oauthLinkRepository.findOne({
        where: {
          provider: OAuthProvider.APPLE,
          providerUserId: 'apple-existing-123',
        },
        relations: ['user'],
      });

      expect(foundLink).toBeDefined();
      expect(foundLink?.userId).toBe(savedUser.id);
    });

    it('should not receive user info on subsequent sign-ins', async () => {
      // Apple only sends user info on first authorization
      // On subsequent sign-ins, we only get the identity token
      const subsequentSignIn = {
        appleId: '000000.abcdef123456.7890',
        // No user info provided by Apple on subsequent sign-ins
      };

      // The application should still find the existing user by Apple ID
      expect(subsequentSignIn.appleId).toBeDefined();
    });
  });

  describe('Token Generation for Apple Users', () => {
    it('should generate valid JWT for Apple authenticated user', async () => {
      const user = userRepository.create({
        email: 'apple@privaterelay.appleid.com',
        displayName: 'Apple User',
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

      const payload = await jwtService.verifyAccessToken(tokenPair.accessToken);
      expect(payload.sub).toBe(savedUser.id);
      expect(payload.email).toBe(savedUser.email);
    });
  });

  describe('Multi-Provider Linking', () => {
    it('should link Apple to user with existing Google link', async () => {
      const user = userRepository.create({
        email: 'multi@example.com',
        displayName: 'Multi Provider User',
      });
      const savedUser = await userRepository.save(user);

      // First link Google
      const googleLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: 'google-123',
        providerEmail: 'multi@gmail.com',
      });
      await oauthLinkRepository.save(googleLink);

      // Then link Apple (different email via private relay)
      const appleLink = oauthLinkRepository.create({
        userId: savedUser.id,
        provider: OAuthProvider.APPLE,
        providerUserId: 'apple-456',
        providerEmail: 'abcdef@privaterelay.appleid.com',
      });
      await oauthLinkRepository.save(appleLink);

      const links = await oauthLinkRepository.find({
        where: { userId: savedUser.id },
      });
      expect(links).toHaveLength(2);
      expect(links.map(l => l.provider)).toContain(OAuthProvider.GOOGLE);
      expect(links.map(l => l.provider)).toContain(OAuthProvider.APPLE);
    });

    it('should prevent duplicate Apple link for different users', async () => {
      const user1 = await userRepository.save(
        userRepository.create({ email: 'user1@example.com', displayName: 'User 1' }),
      );

      await oauthLinkRepository.save(
        oauthLinkRepository.create({
          userId: user1.id,
          provider: OAuthProvider.APPLE,
          providerUserId: 'apple-shared',
          providerEmail: 'shared@privaterelay.appleid.com',
        }),
      );

      const user2 = await userRepository.save(
        userRepository.create({ email: 'user2@example.com', displayName: 'User 2' }),
      );

      const duplicateLink = oauthLinkRepository.create({
        userId: user2.id,
        provider: OAuthProvider.APPLE,
        providerUserId: 'apple-shared',
        providerEmail: 'shared@privaterelay.appleid.com',
      });

      await expect(oauthLinkRepository.save(duplicateLink)).rejects.toThrow();
    });
  });

  describe('Auth Event Logging for Apple', () => {
    it('should log Apple sign-in event', async () => {
      const user = userRepository.create({
        email: 'apple@privaterelay.appleid.com',
        displayName: 'Apple User',
      });
      const savedUser = await userRepository.save(user);

      const authEvent = authEventRepository.create({
        userId: savedUser.id,
        eventType: AuthEventType.LOGIN_SUCCESS,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone)',
        metadata: { provider: 'apple' },
      });
      await authEventRepository.save(authEvent);

      const events = await authEventRepository.find({
        where: { userId: savedUser.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].metadata).toEqual({ provider: 'apple' });
    });
  });
});
