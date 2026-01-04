/**
 * User profile data structure
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  householdId?: string | null;
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  deletionRequestedAt?: Date | null;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  reminderNotifications?: boolean;
}

/**
 * Profile update request
 */
export interface ProfileUpdateRequest {
  displayName?: string;
  avatarUrl?: string | null;
  notificationPreferences?: Partial<NotificationPreferences>;
}

/**
 * OAuth link information
 */
export interface OAuthLinkInfo {
  provider: 'google' | 'apple';
  email: string;
  linkedAt: Date;
}

/**
 * Household information
 */
export interface HouseholdInfo {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
}

/**
 * Household member information
 */
export interface HouseholdMemberInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  role: 'owner' | 'member';
  joinedAt: Date;
}

/**
 * Household invite information
 */
export interface HouseholdInviteInfo {
  code: string;
  expiresAt: Date;
  createdAt: Date;
  createdBy: string;
  used: boolean;
}

/**
 * Account deletion status
 */
export interface AccountDeletionStatus {
  deletionRequestedAt: Date;
  deletionScheduledAt: Date;
  message: string;
}
