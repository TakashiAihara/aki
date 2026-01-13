import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { typeOrmConfig } from './infrastructure/persistence/typeorm.config';
import { RedisModule } from './infrastructure/cache/redis.module';
import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { HealthController } from './presentation/controllers/health.controller';
import { InventoryModule } from './inventory.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRoot(typeOrmConfig),

    // Passport for JWT authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Health checks
    TerminusModule,

    // Redis cache
    RedisModule,

    // Inventory management
    InventoryModule,
  ],
  controllers: [HealthController],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
