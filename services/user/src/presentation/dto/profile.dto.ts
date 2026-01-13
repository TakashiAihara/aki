import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable push notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable reminder notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  reminderNotifications?: boolean;
}

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({
    description: 'Display name (1-100 characters)',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL (HTTPS required) or null to clear',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    type: NotificationPreferencesDto,
  })
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  @IsOptional()
  notificationPreferences?: NotificationPreferencesDto;
}

export class ProfileResponseDto {
  @ApiProperty({
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'John Doe',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Household UUID if user is a member',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  householdId?: string | null;

  @ApiProperty({
    description: 'Notification preferences',
    type: NotificationPreferencesDto,
  })
  notificationPreferences!: NotificationPreferencesDto;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Account deletion request timestamp',
    example: '2024-01-15T00:00:00.000Z',
    nullable: true,
  })
  deletionScheduledAt?: Date | null;
}

export class OAuthLinkResponseDto {
  @ApiProperty({
    description: 'OAuth provider',
    enum: ['google', 'apple'],
    example: 'google',
  })
  provider!: 'google' | 'apple';

  @ApiProperty({
    description: 'Email associated with the OAuth provider',
    example: 'user@gmail.com',
  })
  email!: string;

  @ApiProperty({
    description: 'When the OAuth account was linked',
    example: '2024-01-01T00:00:00.000Z',
  })
  linkedAt!: Date;
}
