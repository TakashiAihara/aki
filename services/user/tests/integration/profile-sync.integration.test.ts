import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../src/domain/entities/user.entity';
import { OAuthLink, OAuthProvider } from '../../src/domain/entities/oauth-link.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfileService } from '../../src/application/profile/profile.service';

/**
 * Integration tests for profile synchronization across sessions
 * Tests profile persistence and consistency
 */
describe('Profile Sync Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let oauthLinkRepository: Repository<OAuthLink>;
  let profileService: ProfileService;

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
    profileService = moduleFixture.get<ProfileService>(ProfileService);
  });

  beforeEach(async () => {
    await oauthLinkRepository.delete({});
    await userRepository.delete({});
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await app?.close();
  });

  describe('Profile Retrieval', () => {
    it('should retrieve user profile by ID', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          notificationPreferences: {
            emailNotifications: true,
            pushNotifications: false,
          },
        }),
      );

      const profile = await profileService.getProfile(user.id);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(user.id);
      expect(profile.email).toBe('test@example.com');
      expect(profile.displayName).toBe('Test User');
      expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        profileService.getProfile('non-existent-uuid'),
      ).rejects.toThrow();
    });
  });

  describe('Profile Update', () => {
    it('should update display name', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Original Name',
        }),
      );

      const updatedProfile = await profileService.updateProfile(user.id, {
        displayName: 'Updated Name',
      });

      expect(updatedProfile.displayName).toBe('Updated Name');

      // Verify persistence
      const persistedUser = await userRepository.findOne({
        where: { id: user.id },
      });
      expect(persistedUser?.displayName).toBe('Updated Name');
    });

    it('should update avatar URL', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://old-url.com/avatar.jpg',
        }),
      );

      const updatedProfile = await profileService.updateProfile(user.id, {
        avatarUrl: 'https://new-url.com/avatar.jpg',
      });

      expect(updatedProfile.avatarUrl).toBe('https://new-url.com/avatar.jpg');
    });

    it('should clear avatar URL when set to null', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        }),
      );

      const updatedProfile = await profileService.updateProfile(user.id, {
        avatarUrl: null,
      });

      expect(updatedProfile.avatarUrl).toBeNull();
    });

    it('should update notification preferences', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
          notificationPreferences: {
            emailNotifications: true,
            pushNotifications: true,
          },
        }),
      );

      const updatedProfile = await profileService.updateProfile(user.id, {
        notificationPreferences: {
          emailNotifications: false,
          pushNotifications: true,
          reminderNotifications: true,
        },
      });

      expect(updatedProfile.notificationPreferences.emailNotifications).toBe(false);
      expect(updatedProfile.notificationPreferences.pushNotifications).toBe(true);
      expect(updatedProfile.notificationPreferences.reminderNotifications).toBe(true);
    });

    it('should preserve unchanged fields during partial update', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Original Name',
          avatarUrl: 'https://example.com/avatar.jpg',
          notificationPreferences: {
            emailNotifications: true,
          },
        }),
      );

      const updatedProfile = await profileService.updateProfile(user.id, {
        displayName: 'New Name',
        // avatarUrl not included - should be preserved
      });

      expect(updatedProfile.displayName).toBe('New Name');
      expect(updatedProfile.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('Profile Sync Across Sessions', () => {
    it('should reflect profile changes immediately in subsequent reads', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Original Name',
        }),
      );

      // First session reads profile
      const profileV1 = await profileService.getProfile(user.id);
      expect(profileV1.displayName).toBe('Original Name');

      // Update profile
      await profileService.updateProfile(user.id, {
        displayName: 'Updated Name',
      });

      // Second session reads profile - should see update
      const profileV2 = await profileService.getProfile(user.id);
      expect(profileV2.displayName).toBe('Updated Name');
    });
  });

  describe('OAuth Links', () => {
    it('should retrieve OAuth links for user', async () => {
      const user = await userRepository.save(
        userRepository.create({
          email: 'test@example.com',
          displayName: 'Test User',
        }),
      );

      await oauthLinkRepository.save(
        oauthLinkRepository.create({
          userId: user.id,
          provider: OAuthProvider.GOOGLE,
          providerUserId: 'google-123',
          providerEmail: 'test@gmail.com',
        }),
      );

      await oauthLinkRepository.save(
        oauthLinkRepository.create({
          userId: user.id,
          provider: OAuthProvider.APPLE,
          providerUserId: 'apple-456',
          providerEmail: 'test@privaterelay.appleid.com',
        }),
      );

      const links = await profileService.getOAuthLinks(user.id);

      expect(links).toHaveLength(2);
      expect(links.map(l => l.provider)).toContain('google');
      expect(links.map(l => l.provider)).toContain('apple');
    });
  });
});
