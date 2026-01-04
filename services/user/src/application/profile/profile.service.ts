import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserProfile, OAuthLinkInfo, ProfileUpdateRequest } from '@akimi/shared';
import { UserRepository, USER_REPOSITORY } from '@domain/repositories/user.repository';
import {
  OAuthLinkRepository,
  OAUTH_LINK_REPOSITORY,
} from '@domain/repositories/oauth-link.repository';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(OAUTH_LINK_REPOSITORY)
    private readonly oauthLinkRepository: OAuthLinkRepository,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserProfile(user);
  }

  async updateProfile(
    userId: string,
    updateData: ProfileUpdateRequest,
  ): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate display name if provided
    if (updateData.displayName !== undefined) {
      this.validateDisplayName(updateData.displayName);
    }

    // Validate avatar URL if provided
    if (updateData.avatarUrl !== undefined && updateData.avatarUrl !== null) {
      this.validateAvatarUrl(updateData.avatarUrl);
    }

    // Build update object
    const updateFields: Record<string, unknown> = {};

    if (updateData.displayName !== undefined) {
      updateFields.displayName = updateData.displayName;
    }

    if (updateData.avatarUrl !== undefined) {
      updateFields.avatarUrl = updateData.avatarUrl;
    }

    if (updateData.notificationPreferences !== undefined) {
      // Merge with existing preferences
      updateFields.notificationPreferences = {
        ...user.notificationPreferences,
        ...updateData.notificationPreferences,
      };
    }

    const updatedUser = await this.userRepository.update(userId, updateFields);

    return this.toUserProfile(updatedUser);
  }

  async getOAuthLinks(userId: string): Promise<OAuthLinkInfo[]> {
    const links = await this.oauthLinkRepository.findByUserId(userId);

    return links.map(link => ({
      provider: link.provider as 'google' | 'apple',
      email: link.providerEmail,
      linkedAt: link.createdAt,
    }));
  }

  private validateDisplayName(displayName: string): void {
    if (!displayName || displayName.trim().length === 0) {
      throw new BadRequestException('Display name cannot be empty');
    }

    if (displayName.length > 100) {
      throw new BadRequestException('Display name cannot exceed 100 characters');
    }

    // Allow letters, numbers, spaces, hyphens, underscores, and Unicode characters
    // This is permissive to support international names
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('Display name cannot be only whitespace');
    }
  }

  private validateAvatarUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new BadRequestException('Avatar URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid avatar URL format');
    }
  }

  private toUserProfile(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    householdId?: string | null;
    notificationPreferences: Record<string, unknown>;
    createdAt: Date;
    deletionRequestedAt?: Date | null;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      householdId: user.householdId ?? null,
      notificationPreferences: {
        emailNotifications: user.notificationPreferences?.emailNotifications as boolean | undefined,
        pushNotifications: user.notificationPreferences?.pushNotifications as boolean | undefined,
        reminderNotifications: user.notificationPreferences?.reminderNotifications as boolean | undefined,
      },
      createdAt: user.createdAt,
      deletionRequestedAt: user.deletionRequestedAt ?? null,
    };
  }
}
