/**
 * Account DTOs
 *
 * Request and response DTOs for account management endpoints.
 */

import { ApiProperty } from '@nestjs/swagger';

export class DeletionRequestResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Your account has been scheduled for deletion',
  })
  message!: string;

  @ApiProperty({
    description: 'Date when account will be permanently deleted',
    example: '2024-02-01T00:00:00.000Z',
  })
  deletionScheduledAt!: Date;

  @ApiProperty({
    description: 'Number of days before permanent deletion',
    example: 30,
  })
  gracePeriodDays!: number;
}

export class DeletionCancelResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Account deletion has been cancelled',
  })
  message!: string;
}

export class AccountStatusResponseDto {
  @ApiProperty({
    description: 'Current account status',
    enum: ['active', 'pending_deletion'],
    example: 'active',
  })
  status!: 'active' | 'pending_deletion';

  @ApiProperty({
    description: 'Date when account will be deleted (if pending deletion)',
    example: '2024-02-01T00:00:00.000Z',
    nullable: true,
    required: false,
  })
  deletionScheduledAt?: Date | null;

  @ApiProperty({
    description: 'Days remaining before permanent deletion (if pending)',
    example: 25,
    nullable: true,
    required: false,
  })
  daysUntilDeletion?: number | null;
}
