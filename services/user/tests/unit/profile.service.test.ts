import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../../src/application/profile/profile.service';
import { UserRepository } from '../../src/domain/repositories/user.repository';
import { OAuthLinkRepository } from '../../src/domain/repositories/oauth-link.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OAuthProvider } from '../../src/domain/entities/oauth-link.entity';

/**
 * Unit tests for ProfileService
 * Tests profile retrieval and update logic in isolation
 */
describe('ProfileService', () => {
  let service: ProfileService;
  let userRepository: jest.Mocked<UserRepository>;
  let oauthLinkRepository: jest.Mocked<OAuthLinkRepository>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    householdId: null,
    notificationPreferences: {
      emailNotifications: true,
      pushNotifications: true,
      reminderNotifications: false,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletionScheduledAt: null,
    oauthLinks: [],
    refreshTokens: [],
  };

  const mockOAuthLinks = [
    {
      id: 'link-1',
      userId: mockUser.id,
      provider: OAuthProvider.GOOGLE,
      providerUserId: 'google-123',
      providerEmail: 'test@gmail.com',
      createdAt: new Date('2024-01-01'),
      user: mockUser,
    },
    {
      id: 'link-2',
      userId: mockUser.id,
      provider: OAuthProvider.APPLE,
      providerUserId: 'apple-456',
      providerEmail: 'test@privaterelay.appleid.com',
      createdAt: new Date('2024-01-02'),
      user: mockUser,
    },
  ];

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };

    const mockOAuthLinkRepository = {
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: 'UserRepository', useValue: mockUserRepository },
        { provide: 'OAuthLinkRepository', useValue: mockOAuthLinkRepository },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    userRepository = module.get('UserRepository');
    oauthLinkRepository = module.get('OAuthLinkRepository');
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const profile = await service.getProfile(mockUser.id);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(mockUser.id);
      expect(profile.email).toBe(mockUser.email);
      expect(profile.displayName).toBe(mockUser.displayName);
      expect(profile.avatarUrl).toBe(mockUser.avatarUrl);
      expect(profile.notificationPreferences).toEqual(mockUser.notificationPreferences);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include householdId when user is a member', async () => {
      const userWithHousehold = { ...mockUser, householdId: 'household-uuid' };
      userRepository.findById.mockResolvedValue(userWithHousehold);

      const profile = await service.getProfile(mockUser.id);

      expect(profile.householdId).toBe('household-uuid');
    });
  });

  describe('updateProfile', () => {
    it('should update display name', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        displayName: 'New Name',
      });

      const result = await service.updateProfile(mockUser.id, {
        displayName: 'New Name',
      });

      expect(result.displayName).toBe('New Name');
      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ displayName: 'New Name' }),
      );
    });

    it('should update avatar URL', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'https://new-url.com/avatar.jpg',
      });

      const result = await service.updateProfile(mockUser.id, {
        avatarUrl: 'https://new-url.com/avatar.jpg',
      });

      expect(result.avatarUrl).toBe('https://new-url.com/avatar.jpg');
    });

    it('should allow clearing avatar URL', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        avatarUrl: null,
      });

      const result = await service.updateProfile(mockUser.id, {
        avatarUrl: null,
      });

      expect(result.avatarUrl).toBeNull();
    });

    it('should update notification preferences', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        notificationPreferences: {
          emailNotifications: false,
          pushNotifications: true,
          reminderNotifications: true,
        },
      });

      const result = await service.updateProfile(mockUser.id, {
        notificationPreferences: {
          emailNotifications: false,
          reminderNotifications: true,
        },
      });

      expect(result.notificationPreferences.emailNotifications).toBe(false);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent', { displayName: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for empty display name', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile(mockUser.id, { displayName: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for display name over 100 chars', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile(mockUser.id, { displayName: 'a'.repeat(101) }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOAuthLinks', () => {
    it('should return OAuth links for user', async () => {
      oauthLinkRepository.findByUserId.mockResolvedValue(mockOAuthLinks);

      const links = await service.getOAuthLinks(mockUser.id);

      expect(links).toHaveLength(2);
      expect(links[0].provider).toBe('google');
      expect(links[1].provider).toBe('apple');
    });

    it('should return empty array when no links exist', async () => {
      oauthLinkRepository.findByUserId.mockResolvedValue([]);

      const links = await service.getOAuthLinks(mockUser.id);

      expect(links).toHaveLength(0);
    });

    it('should transform OAuthLink to OAuthLinkInfo', async () => {
      oauthLinkRepository.findByUserId.mockResolvedValue(mockOAuthLinks);

      const links = await service.getOAuthLinks(mockUser.id);

      expect(links[0]).toHaveProperty('provider');
      expect(links[0]).toHaveProperty('email');
      expect(links[0]).toHaveProperty('linkedAt');
    });
  });

  describe('validation', () => {
    it('should validate display name characters', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      // Valid names
      const validNames = [
        'John Doe',
        'María García',
        '山田太郎',
        'Test-User_123',
      ];

      for (const name of validNames) {
        userRepository.update.mockResolvedValue({ ...mockUser, displayName: name });
        const result = await service.updateProfile(mockUser.id, { displayName: name });
        expect(result.displayName).toBe(name);
      }
    });
  });
});
