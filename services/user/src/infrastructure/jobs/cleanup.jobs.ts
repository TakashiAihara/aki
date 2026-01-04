/**
 * Cleanup Jobs
 *
 * Scheduled jobs for cleaning up expired data.
 */

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, LessThan } from 'typeorm';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { HouseholdInvite } from '@domain/entities/household-invite.entity';
import { AuthEvent } from '@domain/entities/auth-event.entity';
import { DeviceCode } from '@domain/entities/device-code.entity';
import { LoggerService } from '@infrastructure/logging/logger.service';

// Retention periods
const AUTH_EVENT_RETENTION_DAYS = 90;

@Injectable()
export class CleanupJobs {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Clean up expired refresh tokens
   * Runs daily at 03:00 UTC
   */
  @Cron('0 3 * * *', {
    name: 'cleanupExpiredRefreshTokens',
    timeZone: 'UTC',
  })
  async cleanupExpiredRefreshTokens(): Promise<number> {
    this.logger.log('Starting expired refresh token cleanup', 'CleanupJobs');

    const refreshTokenRepo = this.dataSource.getRepository(RefreshToken);
    const now = new Date();

    const result = await refreshTokenRepo.delete({
      expiresAt: LessThan(now),
    });

    const deletedCount = result.affected || 0;

    this.logger.log(
      `Deleted ${deletedCount} expired refresh tokens`,
      'CleanupJobs',
    );

    return deletedCount;
  }

  /**
   * Clean up expired household invite codes
   * Runs daily at 03:15 UTC
   */
  @Cron('15 3 * * *', {
    name: 'cleanupExpiredInviteCodes',
    timeZone: 'UTC',
  })
  async cleanupExpiredInviteCodes(): Promise<number> {
    this.logger.log('Starting expired invite code cleanup', 'CleanupJobs');

    const inviteRepo = this.dataSource.getRepository(HouseholdInvite);
    const now = new Date();

    const result = await inviteRepo.delete({
      expiresAt: LessThan(now),
    });

    const deletedCount = result.affected || 0;

    this.logger.log(
      `Deleted ${deletedCount} expired invite codes`,
      'CleanupJobs',
    );

    return deletedCount;
  }

  /**
   * Clean up old auth events beyond retention period
   * Runs daily at 03:30 UTC
   */
  @Cron('30 3 * * *', {
    name: 'cleanupOldAuthEvents',
    timeZone: 'UTC',
  })
  async cleanupOldAuthEvents(): Promise<number> {
    this.logger.log(
      `Starting auth event cleanup (${AUTH_EVENT_RETENTION_DAYS} days retention)`,
      'CleanupJobs',
    );

    const authEventRepo = this.dataSource.getRepository(AuthEvent);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTH_EVENT_RETENTION_DAYS);

    const result = await authEventRepo.delete({
      createdAt: LessThan(cutoffDate),
    });

    const deletedCount = result.affected || 0;

    this.logger.log(
      `Deleted ${deletedCount} auth events older than ${AUTH_EVENT_RETENTION_DAYS} days`,
      'CleanupJobs',
    );

    return deletedCount;
  }

  /**
   * Clean up expired device codes
   * Runs every hour at minute 45
   */
  @Cron('45 * * * *', {
    name: 'cleanupExpiredDeviceCodes',
    timeZone: 'UTC',
  })
  async cleanupExpiredDeviceCodes(): Promise<number> {
    this.logger.log('Starting expired device code cleanup', 'CleanupJobs');

    const deviceCodeRepo = this.dataSource.getRepository(DeviceCode);
    const now = new Date();

    const result = await deviceCodeRepo.delete({
      expiresAt: LessThan(now),
    });

    const deletedCount = result.affected || 0;

    this.logger.log(
      `Deleted ${deletedCount} expired device codes`,
      'CleanupJobs',
    );

    return deletedCount;
  }

  /**
   * Manual trigger for all cleanup jobs (for testing)
   */
  async runAllCleanups(): Promise<{
    refreshTokens: number;
    inviteCodes: number;
    authEvents: number;
    deviceCodes: number;
  }> {
    this.logger.log('Running all cleanup jobs manually', 'CleanupJobs');

    const [refreshTokens, inviteCodes, authEvents, deviceCodes] = await Promise.all([
      this.cleanupExpiredRefreshTokens(),
      this.cleanupExpiredInviteCodes(),
      this.cleanupOldAuthEvents(),
      this.cleanupExpiredDeviceCodes(),
    ]);

    return { refreshTokens, inviteCodes, authEvents, deviceCodes };
  }
}
