import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

// Entities
import { User } from '@domain/entities/user.entity';
import { OAuthLink } from '@domain/entities/oauth-link.entity';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { AuthEvent } from '@domain/entities/auth-event.entity';
import { DeviceCode } from '@domain/entities/device-code.entity';

// Repositories
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { OAUTH_LINK_REPOSITORY } from '@domain/repositories/oauth-link.repository';
import { REFRESH_TOKEN_REPOSITORY } from '@domain/repositories/refresh-token.repository';
import { UserRepositoryImpl } from '@infrastructure/persistence/user.repository.impl';
import { OAuthLinkRepositoryImpl } from '@infrastructure/persistence/oauth-link.repository.impl';
import { RefreshTokenRepositoryImpl } from '@infrastructure/persistence/refresh-token.repository.impl';

// Infrastructure
import { JwtService } from '@infrastructure/auth/jwt.service';
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy';
import { GoogleStrategy } from '@infrastructure/auth/google.strategy';
import { AppleStrategy } from '@infrastructure/auth/apple.strategy';
import { AppleTokenService } from '@infrastructure/auth/apple-token.service';
import { OAuthStateService } from '@infrastructure/auth/oauth-state.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { TokenBlacklistService } from '@infrastructure/cache/token-blacklist.service';
import { LoggerService } from '@infrastructure/logging/logger.service';

// Application
import { GoogleOAuthUseCase } from '@application/auth/google-oauth.usecase';
import { AppleSignInUseCase } from '@application/auth/apple-signin.usecase';
import { TokenRefreshUseCase } from '@application/auth/token-refresh.usecase';
import { LogoutUseCase } from '@application/auth/logout.usecase';
import { AuthEventService } from '@application/auth/auth-event.service';
import { RefreshTokenService } from '@application/auth/refresh-token.service';
import { DeviceFlowUseCase } from '@application/auth/device-flow.usecase';

// Presentation
import { AuthController } from '@presentation/controllers/auth.controller';
import { TokenController } from '@presentation/controllers/token.controller';
import { DeviceController } from '@presentation/controllers/device.controller';
import { JwtAuthGuard } from '@presentation/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, OAuthLink, RefreshToken, AuthEvent, DeviceCode]),
  ],
  controllers: [AuthController, TokenController, DeviceController],
  providers: [
    // Infrastructure
    JwtService,
    JwtStrategy,
    GoogleStrategy,
    AppleStrategy,
    AppleTokenService,
    OAuthStateService,
    RedisService,
    TokenBlacklistService,
    LoggerService,

    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    {
      provide: OAUTH_LINK_REPOSITORY,
      useClass: OAuthLinkRepositoryImpl,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: RefreshTokenRepositoryImpl,
    },

    // Application Services
    GoogleOAuthUseCase,
    AppleSignInUseCase,
    TokenRefreshUseCase,
    LogoutUseCase,
    AuthEventService,
    RefreshTokenService,
    DeviceFlowUseCase,

    // Guards
    JwtAuthGuard,
  ],
  exports: [
    JwtService,
    JwtAuthGuard,
    AuthEventService,
    RefreshTokenService,
    USER_REPOSITORY,
    OAUTH_LINK_REPOSITORY,
    RedisService,
  ],
})
export class AuthModule {}
