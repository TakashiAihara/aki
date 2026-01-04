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
import { AppleTokenService, AppleTokenPayload } from '@infrastructure/auth/apple-token.service';
import { OAuthStateService } from '@infrastructure/auth/oauth-state.service';
import { AuthEventService } from './auth-event.service';
import { RefreshTokenService } from './refresh-token.service';

export interface AppleUserInfo {
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
}

export interface AppleSignInContext {
  ipAddress: string;
  userAgent?: string;
  state?: string;
}

@Injectable()
export class AppleSignInUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(OAUTH_LINK_REPOSITORY)
    private readonly oauthLinkRepository: OAuthLinkRepository,
    private readonly jwtService: JwtService,
    private readonly appleTokenService: AppleTokenService,
    private readonly authEventService: AuthEventService,
    private readonly oauthStateService: OAuthStateService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async execute(
    identityToken: string,
    userInfo: AppleUserInfo | undefined,
    context: AppleSignInContext,
  ): Promise<TokenPair> {
    // Validate OAuth state for CSRF protection
    if (context.state) {
      const isValidState = await this.oauthStateService.consumeState(context.state);
      if (!isValidState) {
        await this.authEventService.logLoginFailure(
          context.ipAddress,
          context.userAgent,
          'invalid_state',
          undefined,
        );
        throw new UnauthorizedException('Invalid OAuth state - possible CSRF attack');
      }
    }

    // Verify Apple identity token
    let applePayload: AppleTokenPayload;
    try {
      applePayload = await this.appleTokenService.verifyIdentityToken(identityToken);
    } catch (error) {
      await this.authEventService.logLoginFailure(
        context.ipAddress,
        context.userAgent,
        'invalid_identity_token',
        undefined,
      );
      throw error;
    }

    // Check if this Apple account is already linked
    const existingLink = await this.oauthLinkRepository.findByProviderAndProviderId(
      OAuthProvider.APPLE,
      applePayload.sub,
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
      // New Apple account - check if user exists with same email
      const existingUser = await this.userRepository.findByEmail(applePayload.email);

      if (existingUser) {
        // Link Apple to existing account
        user = existingUser;

        if (user.deletionRequestedAt) {
          throw new UnauthorizedException(
            'Account is pending deletion. Login is not allowed.',
          );
        }

        const link = this.oauthLinkRepository.create({
          userId: user.id,
          provider: OAuthProvider.APPLE,
          providerUserId: applePayload.sub,
          providerEmail: applePayload.email,
        });
        await this.oauthLinkRepository.save(link);

        await this.authEventService.logOAuthLinked(
          user.id,
          context.ipAddress,
          'apple',
          context.userAgent,
        );
      } else {
        // Create new user
        const displayName = this.getDisplayName(userInfo, applePayload.email);

        user = this.userRepository.create({
          email: applePayload.email,
          displayName,
        });
        user = await this.userRepository.save(user);

        const link = this.oauthLinkRepository.create({
          userId: user.id,
          provider: OAuthProvider.APPLE,
          providerUserId: applePayload.sub,
          providerEmail: applePayload.email,
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
      'apple',
    );

    return tokenPair;
  }

  private getDisplayName(userInfo: AppleUserInfo | undefined, email: string): string {
    // Apple only sends user info on first authorization
    if (userInfo?.name) {
      const { firstName, lastName } = userInfo.name;
      const fullName = `${firstName || ''} ${lastName || ''}`.trim();
      if (fullName) {
        return fullName;
      }
    }

    // Fallback to email prefix
    return email.split('@')[0];
  }
}
