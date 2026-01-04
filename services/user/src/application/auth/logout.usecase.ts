import { Injectable, Inject } from '@nestjs/common';
import { JwtPayload } from '@aki/shared';
import { RefreshTokenService } from './refresh-token.service';
import { AuthEventService } from './auth-event.service';
import { TokenBlacklistService } from '@infrastructure/cache/token-blacklist.service';

export interface LogoutContext {
  ipAddress: string;
  userAgent?: string;
}

export interface LogoutResult {
  message: string;
}

export interface LogoutAllResult {
  message: string;
  count: number;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly authEventService: AuthEventService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async logout(
    refreshToken: string,
    user: JwtPayload,
    context: LogoutContext,
  ): Promise<LogoutResult> {
    // Revoke the refresh token
    await this.refreshTokenService.revokeToken(refreshToken);

    // Blacklist the current access token JTI
    if (user.jti && user.exp) {
      const ttl = user.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.tokenBlacklistService.addToBlacklist(user.jti, ttl);
      }
    }

    // Log logout event
    await this.authEventService.logLogout(
      user.sub,
      context.ipAddress,
      context.userAgent,
    );

    return { message: 'Token revoked successfully' };
  }

  async logoutAll(
    user: JwtPayload,
    context: LogoutContext,
  ): Promise<LogoutAllResult> {
    // Revoke all user's refresh tokens
    const count = await this.refreshTokenService.revokeAllUserTokens(user.sub);

    // Blacklist the current access token JTI
    if (user.jti && user.exp) {
      const ttl = user.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.tokenBlacklistService.addToBlacklist(user.jti, ttl);
      }
    }

    // Log logout event
    await this.authEventService.logLogout(
      user.sub,
      context.ipAddress,
      context.userAgent,
    );

    return {
      message: 'All tokens revoked',
      count,
    };
  }
}
