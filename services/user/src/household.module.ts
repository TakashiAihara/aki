import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from '@domain/entities/user.entity';
import { Household } from '@domain/entities/household.entity';
import { HouseholdMember } from '@domain/entities/household-member.entity';
import { HouseholdInvite } from '@domain/entities/household-invite.entity';

// Repositories
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { HOUSEHOLD_REPOSITORY } from '@domain/repositories/household.repository';
import { UserRepositoryImpl } from '@infrastructure/persistence/user.repository.impl';
import { HouseholdRepositoryImpl } from '@infrastructure/persistence/household.repository.impl';

// Application
import { HouseholdService } from '@application/household/household.service';

// Presentation
import { HouseholdController } from '@presentation/controllers/household.controller';

// Import AuthModule for guards
import { AuthModule } from './auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Household, HouseholdMember, HouseholdInvite]),
    AuthModule,
  ],
  controllers: [HouseholdController],
  providers: [
    HouseholdService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    {
      provide: HOUSEHOLD_REPOSITORY,
      useClass: HouseholdRepositoryImpl,
    },
  ],
  exports: [HouseholdService],
})
export class HouseholdModule {}
