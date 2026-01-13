import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { typeOrmConfig } from './infrastructure/persistence/typeorm.config';
import { AuthModule } from './auth.module';
import { ProfileModule } from './profile.module';
import { HouseholdModule } from './household.module';
import { AccountModule } from './account.module';
import { HealthController } from './presentation/controllers/health.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRoot(typeOrmConfig),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute for auth endpoints
      },
      {
        name: 'token',
        ttl: 60000,
        limit: 60, // 60 requests per minute for token endpoints
      },
    ]),

    // Scheduling for cleanup jobs
    ScheduleModule.forRoot(),

    // Health checks
    TerminusModule,

    // Authentication
    AuthModule,

    // Profile Management
    ProfileModule,

    // Household Management
    HouseholdModule,

    // Account Management (GDPR)
    AccountModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global JWT guard - all routes require auth by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
