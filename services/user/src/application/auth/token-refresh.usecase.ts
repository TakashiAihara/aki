import {
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenPair } from '@akimi/shared';
import { UserRepository, USER_REPOSITORY } from '@domain/repositories/user.repository';
import { JwtService } from '@infrastructure/auth/jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuthEventService } from './auth-event.service';

export interface RefreshContext {
  ipAddress: string;
  userAgent?: string;
}

@Injectable()
export class TokenRefreshUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly authEventService: AuthEventService,
  ) {}

  async execute(
    refreshToken: string,
    context: RefreshContext,
  ): Promise<TokenPair> {
    // Validate refresh token
    const storedToken = await this.refreshTokenService.validateToken(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.userRepository.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check for pending deletion
    if (user.deletionRequestedAt) {
      throw new UnauthorizedException(
        'Account is pending deletion. Token refresh is not allowed.',
      );
    }

    // Rotate refresh token (invalidate old, create new)
    const rotationResult = await this.refreshTokenService.rotateToken(
      refreshToken,
      user.id,
      context.ipAddress,
      context.userAgent,
    );

    if (!rotationResult) {
      throw new UnauthorizedException('Failed to rotate refresh token');
    }

    // Generate new access token
    const tokenPair = await this.jwtService.generateTokenPair(
      user.id,
      user.email,
      user.householdId ?? undefined,
      'user',
    );

    // Replace the refresh token with the rotated one
    const finalTokenPair: TokenPair = {
      ...tokenPair,
      refreshToken: rotationResult.newToken,
    };

    // Log token refresh event
    await this.authEventService.logTokenRefresh(
      user.id,
      context.ipAddress,
      context.userAgent,
    );

    return finalTokenPair;
  }
}
