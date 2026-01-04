/**
 * Account Module
 *
 * Module for account management including GDPR-compliant deletion.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from '@domain/entities/user.entity';
import { OAuthLink } from '@domain/entities/oauth-link.entity';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { AuthEvent } from '@domain/entities/auth-event.entity';
import { Household } from '@domain/entities/household.entity';
import { HouseholdMember } from '@domain/entities/household-member.entity';
import { HouseholdInvite } from '@domain/entities/household-invite.entity';

// Repositories
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { HOUSEHOLD_REPOSITORY } from '@domain/repositories/household.repository';
import { UserRepositoryImpl } from '@infrastructure/persistence/user.repository.impl';
import { HouseholdRepositoryImpl } from '@infrastructure/persistence/household.repository.impl';

// Application
import { AccountDeletionService } from '@application/account/account-deletion.service';

// Infrastructure
import { DeletionProcessorJob } from '@infrastructure/jobs/deletion-processor.job';
import { LoggerService } from '@infrastructure/logging/logger.service';

// Presentation
import { AccountController } from '@presentation/controllers/account.controller';

// Import AuthModule for AuthEventService
import { AuthModule } from './auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      OAuthLink,
      RefreshToken,
      AuthEvent,
      Household,
      HouseholdMember,
      HouseholdInvite,
    ]),
    AuthModule,
  ],
  controllers: [AccountController],
  providers: [
    AccountDeletionService,
    DeletionProcessorJob,
    LoggerService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    {
      provide: HOUSEHOLD_REPOSITORY,
      useClass: HouseholdRepositoryImpl,
    },
  ],
  exports: [AccountDeletionService],
})
export class AccountModule {}
