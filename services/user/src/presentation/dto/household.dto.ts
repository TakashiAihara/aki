import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateHouseholdRequestDto {
  @ApiProperty({
    description: 'Household name (1-100 characters)',
    example: 'Smith Family',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

export class JoinHouseholdRequestDto {
  @ApiProperty({
    description: 'Invite code (8 characters)',
    example: 'ABCD1234',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{8}$/, {
    message: 'Invite code must be 8 alphanumeric characters',
  })
  code!: string;
}

export class UpdateHouseholdRequestDto {
  @ApiProperty({
    description: 'New household name',
    example: 'Updated Family Name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

export class TransferOwnershipRequestDto {
  @ApiProperty({
    description: 'User ID of the new owner',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  newOwnerId!: string;
}

export class RemoveMemberRequestDto {
  @ApiProperty({
    description: 'User ID of the member to remove',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class HouseholdResponseDto {
  @ApiProperty({
    description: 'Household UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Household name',
    example: 'Smith Family',
  })
  name!: string;

  @ApiProperty({
    description: 'Owner user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  ownerId!: string;

  @ApiProperty({
    description: 'Number of members',
    example: 4,
  })
  memberCount!: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: Date;
}

export class HouseholdMemberResponseDto {
  @ApiProperty({
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'John Smith',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({
    description: 'Role in household',
    enum: ['owner', 'member'],
    example: 'member',
  })
  role!: 'owner' | 'member';

  @ApiProperty({
    description: 'When user joined',
    example: '2024-01-01T00:00:00.000Z',
  })
  joinedAt!: Date;
}

export class HouseholdInviteResponseDto {
  @ApiProperty({
    description: 'Invite code',
    example: 'ABCD1234',
  })
  code!: string;

  @ApiProperty({
    description: 'Expiration timestamp',
    example: '2024-01-03T00:00:00.000Z',
  })
  expiresAt!: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'User who created the invite',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'Whether invite has been used',
    example: false,
  })
  used!: boolean;
}
