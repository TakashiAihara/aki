import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { TokenPair } from '@aki/shared';
import { UserRepository, USER_REPOSITORY } from '@domain/repositories/user.repository';
import {
  OAuthLinkRepository,
  OAUTH_LINK_REPOSITORY,
} from '@domain/repositories/oauth-link.repository';
import { OAuthProvider } from '@domain/entities/oauth-link.entity';
import { JwtService } from '@infrastructure/auth/jwt.service';
import { OAuthStateService } from '@infrastructure/auth/oauth-state.service';
import { AuthEventService } from './auth-event.service';
import { RefreshTokenService } from './refresh-token.service';
import { GoogleProfile } from '@infrastructure/auth/google.strategy';

export interface OAuthRequestContext {
  ipAddress: string;
  userAgent?: string;
  state?: string;
}

@Injectable()
export class GoogleOAuthUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(OAUTH_LINK_REPOSITORY)
    private readonly oauthLinkRepository: OAuthLinkRepository,
    private readonly jwtService: JwtService,
    private readonly authEventService: AuthEventService,
    private readonly oauthStateService: OAuthStateService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async execute(
    profile: GoogleProfile,
    context: OAuthRequestContext,
  ): Promise<TokenPair> {
    // Validate OAuth state for CSRF protection
    if (context.state) {
      const isValidState = await this.oauthStateService.consumeState(context.state);
      if (!isValidState) {
        await this.authEventService.logLoginFailure(
          context.ipAddress,
          context.userAgent,
          'invalid_state',
          profile.email,
        );
        throw new UnauthorizedException('Invalid OAuth state - possible CSRF attack');
      }
    }

    // Validate profile data
    this.validateProfile(profile);

    // Check if this Google account is already linked
    const existingLink = await this.oauthLinkRepository.findByProviderAndProviderId(
      OAuthProvider.GOOGLE,
      profile.id,
    );

    let user;

    if (existingLink) {
      // Existing user - retrieve and validate
      user = await this.userRepository.findById(existingLink.userId);
      if (!user) {
        throw new UnauthorizedException('User account not found');
      }

      // Check for pending deletion
      if (user.deletionRequestedAt) {
        throw new UnauthorizedException(
          'Account is pending deletion. Login is not allowed.',
        );
      }
    } else {
      // New Google account - check if user exists with same email
      const existingUser = await this.userRepository.findByEmail(profile.email);

      if (existingUser) {
        // Link Google to existing account
        user = existingUser;

        if (user.deletionRequestedAt) {
          throw new UnauthorizedException(
            'Account is pending deletion. Login is not allowed.',
          );
        }

        const link = this.oauthLinkRepository.create({
          userId: user.id,
          provider: OAuthProvider.GOOGLE,
          providerUserId: profile.id,
          providerEmail: profile.email,
        });
        await this.oauthLinkRepository.save(link);

        await this.authEventService.logOAuthLinked(
          user.id,
          context.ipAddress,
          'google',
          context.userAgent,
        );
      } else {
        // Create new user
        user = this.userRepository.create({
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        });
        user = await this.userRepository.save(user);

        const link = this.oauthLinkRepository.create({
          userId: user.id,
          provider: OAuthProvider.GOOGLE,
          providerUserId: profile.id,
          providerEmail: profile.email,
        });
        await this.oauthLinkRepository.save(link);
      }
    }

    // Generate tokens
    const tokenPair = await this.jwtService.generateTokenPair(
      user.id,
      user.email,
      user.householdId ?? undefined,
      'user',
    );

    // Store refresh token
    await this.refreshTokenService.storeToken(
      user.id,
      tokenPair.refreshToken,
      context.ipAddress,
      context.userAgent,
    );

    // Log successful authentication
    await this.authEventService.logLoginSuccess(
      user.id,
      context.ipAddress,
      context.userAgent,
      'google',
    );

    return tokenPair;
  }

  private validateProfile(profile: GoogleProfile): void {
    if (!profile.id || profile.id.trim() === '') {
      throw new BadRequestException('Invalid Google profile: missing provider ID');
    }

    if (!profile.email || profile.email.trim() === '') {
      throw new BadRequestException('Invalid Google profile: missing email');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      throw new BadRequestException('Invalid Google profile: invalid email format');
    }
  }
}
