/**
 * Account Deletion Service
 *
 * Handles GDPR-compliant account deletion with 30-day grace period.
 */

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DataSource, LessThanOrEqual } from 'typeorm';
import { User, UserStatus } from '@domain/entities/user.entity';
import { OAuthLink } from '@domain/entities/oauth-link.entity';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { AuthEvent } from '@domain/entities/auth-event.entity';
import { Household } from '@domain/entities/household.entity';
import { HouseholdMember, HouseholdRole } from '@domain/entities/household-member.entity';
import { HouseholdInvite } from '@domain/entities/household-invite.entity';
import { USER_REPOSITORY, UserRepository } from '@domain/repositories/user.repository';
import { HOUSEHOLD_REPOSITORY, HouseholdRepository } from '@domain/repositories/household.repository';
import { AuthEventService } from '@application/auth/auth-event.service';
import { LoggerService } from '@infrastructure/logging/logger.service';

const GRACE_PERIOD_DAYS = 30;

export interface DeletionRequestResult {
  message: string;
  deletionScheduledAt: Date;
  gracePeriodDays: number;
}

export interface DeletionCancelResult {
  message: string;
}

@Injectable()
export class AccountDeletionService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepository,
    private readonly authEventService: AuthEventService,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Request account deletion with 30-day grace period
   */
  async requestDeletion(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<DeletionRequestResult> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.PENDING_DELETION) {
      throw new ConflictException('Account is already scheduled for deletion');
    }

    // Calculate deletion date (30 days from now)
    const deletionScheduledAt = new Date();
    deletionScheduledAt.setDate(deletionScheduledAt.getDate() + GRACE_PERIOD_DAYS);

    // Handle household ownership transfer if user is owner
    if (user.householdId) {
      await this.handleHouseholdOwnership(userId, user.householdId);
    }

    // Update user status
    user.status = UserStatus.PENDING_DELETION;
    user.deletionScheduledAt = deletionScheduledAt;
    await this.userRepository.save(user);

    // Log the deletion request
    await this.authEventService.logAccountDeletionRequested(userId, ipAddress, userAgent);

    this.logger.log(
      `Account deletion requested for user ${userId}, scheduled for ${deletionScheduledAt.toISOString()}`,
      'AccountDeletionService',
    );

    return {
      message: 'Your account has been scheduled for deletion',
      deletionScheduledAt,
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  /**
   * Cancel a pending account deletion
   */
  async cancelDeletion(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<DeletionCancelResult> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING_DELETION) {
      throw new ConflictException('Account is not scheduled for deletion');
    }

    // Restore user status
    user.status = UserStatus.ACTIVE;
    user.deletionScheduledAt = null;
    await this.userRepository.save(user);

    // Log the cancellation
    await this.authEventService.logAccountDeletionCancelled(userId, ipAddress, userAgent);

    this.logger.log(
      `Account deletion cancelled for user ${userId}`,
      'AccountDeletionService',
    );

    return {
      message: 'Account deletion has been cancelled',
    };
  }

  /**
   * Process all scheduled deletions that have passed their grace period
   * Called by scheduled job
   */
  async processScheduledDeletions(): Promise<number> {
    const now = new Date();
    const userRepo = this.dataSource.getRepository(User);

    // Find all users with expired grace periods
    const usersToDelete = await userRepo.find({
      where: {
        status: UserStatus.PENDING_DELETION,
        deletionScheduledAt: LessThanOrEqual(now),
      },
    });

    this.logger.log(
      `Processing ${usersToDelete.length} scheduled account deletions`,
      'AccountDeletionService',
    );

    let deletedCount = 0;

    for (const user of usersToDelete) {
      try {
        await this.performHardDelete(user);
        deletedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to delete user ${user.id}: ${error}`,
          'AccountDeletionService',
        );
      }
    }

    this.logger.log(
      `Completed ${deletedCount}/${usersToDelete.length} scheduled deletions`,
      'AccountDeletionService',
    );

    return deletedCount;
  }

  /**
   * Perform hard delete of user and all related data
   */
  private async performHardDelete(user: User): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // Re-fetch user within transaction
      const userToDelete = await manager.findOne(User, {
        where: { id: user.id },
      });

      if (!userToDelete) {
        await queryRunner.rollbackTransaction();
        return;
      }

      // Handle household cleanup if user is still in one
      if (userToDelete.householdId) {
        await this.cleanupHouseholdMembership(manager, userToDelete);
      }

      // Delete related data in order
      // 1. Delete refresh tokens
      await manager.delete(RefreshToken, { userId: user.id });

      // 2. Delete OAuth links
      await manager.delete(OAuthLink, { userId: user.id });

      // 3. Anonymize auth events (keep for audit trail but remove user reference)
      await manager.update(
        AuthEvent,
        { userId: user.id },
        { userId: null as any, metadata: { anonymized: true, originalUserId: user.id } },
      );

      // 4. Delete the user
      await manager.delete(User, { id: user.id });

      await queryRunner.commitTransaction();

      // Log deletion after commit
      await this.authEventService.logAccountDeleted(user.id, 'system');

      this.logger.log(
        `Hard deleted user ${user.id} and all related data`,
        'AccountDeletionService',
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handle household ownership transfer when owner requests deletion
   */
  private async handleHouseholdOwnership(
    userId: string,
    householdId: string,
  ): Promise<void> {
    const household = await this.householdRepository.findById(householdId);

    if (!household) {
      return;
    }

    // Only handle if user is the owner
    if (household.ownerId !== userId) {
      return;
    }

    // Get other members
    const members = await this.householdRepository.findMembersByHouseholdId(householdId);
    const otherMembers = members.filter((m) => m.userId !== userId);

    if (otherMembers.length === 0) {
      // No other members, household will be deleted when user is deleted
      this.logger.log(
        `User ${userId} is last member of household ${householdId}, will be deleted on hard delete`,
        'AccountDeletionService',
      );
      return;
    }

    // Transfer ownership to the oldest member (by join date)
    const newOwner = otherMembers.sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
    )[0];

    household.ownerId = newOwner.userId;
    await this.householdRepository.save(household);

    // Update member roles
    await this.dataSource.getRepository(HouseholdMember).update(
      { userId: newOwner.userId, householdId },
      { role: HouseholdRole.OWNER },
    );

    this.logger.log(
      `Transferred household ${householdId} ownership from ${userId} to ${newOwner.userId}`,
      'AccountDeletionService',
    );
  }

  /**
   * Clean up household membership during hard delete
   */
  private async cleanupHouseholdMembership(
    manager: any,
    user: User,
  ): Promise<void> {
    const householdId = user.householdId;
    if (!householdId) return;

    // Remove user from household members
    await manager.delete(HouseholdMember, { userId: user.id });

    // Check if household is now empty
    const remainingMembers = await manager.find(HouseholdMember, {
      where: { householdId },
    });

    if (remainingMembers.length === 0) {
      // Delete household and invites
      await manager.delete(HouseholdInvite, { householdId });
      await manager.delete(Household, { id: householdId });

      this.logger.log(
        `Deleted empty household ${householdId}`,
        'AccountDeletionService',
      );
    }
  }
}
