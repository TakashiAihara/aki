/**
 * Deletion Processor Job
 *
 * Scheduled job that processes expired account deletions daily at 02:00 UTC.
 */

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountDeletionService } from '@application/account/account-deletion.service';
import { LoggerService } from '@infrastructure/logging/logger.service';

@Injectable()
export class DeletionProcessorJob {
  constructor(
    private readonly accountDeletionService: AccountDeletionService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Process scheduled deletions daily at 02:00 UTC
   * This ensures deletions happen during low-traffic hours
   */
  @Cron('0 2 * * *', {
    name: 'processAccountDeletions',
    timeZone: 'UTC',
  })
  async handleDeletionProcessing(): Promise<void> {
    this.logger.log(
      'Starting scheduled account deletion processing',
      'DeletionProcessorJob',
    );

    const startTime = Date.now();

    try {
      const deletedCount = await this.accountDeletionService.processScheduledDeletions();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed deletion processing: ${deletedCount} accounts deleted in ${duration}ms`,
        'DeletionProcessorJob',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled deletions: ${error}`,
        'DeletionProcessorJob',
      );
    }
  }

  /**
   * Manual trigger for processing (useful for testing)
   */
  async triggerManual(): Promise<number> {
    this.logger.log(
      'Manually triggered account deletion processing',
      'DeletionProcessorJob',
    );

    return this.accountDeletionService.processScheduledDeletions();
  }
}
