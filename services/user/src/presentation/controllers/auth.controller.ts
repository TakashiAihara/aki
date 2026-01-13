import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GoogleOAuthUseCase } from '@application/auth/google-oauth.usecase';
import { AppleSignInUseCase } from '@application/auth/apple-signin.usecase';
import { OAuthStateService } from '@infrastructure/auth/oauth-state.service';
import {
  TokenResponseDto,
  OAuthCallbackDto,
  OAuthErrorResponseDto,
  AppleCallbackDto,
} from '../dto/token.dto';
import { GoogleProfile } from '@infrastructure/auth/google.strategy';
import { Public } from '../decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly googleOAuthUseCase: GoogleOAuthUseCase,
    private readonly appleSignInUseCase: AppleSignInUseCase,
    private readonly oauthStateService: OAuthStateService,
    private readonly configService: ConfigService,
  ) { }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Initiate Google OAuth flow',
    description: 'Redirects to Google OAuth consent screen',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth consent screen',
  })
  async googleAuth(): Promise<void> {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as GoogleProfile;
    const state = (req.query.state as string) || '';

    try {
      const tokenPair = await this.googleOAuthUseCase.execute(profile, {
        ipAddress: this.getIpAddress(req),
        userAgent: req.headers['user-agent'],
        state,
      });

      // For web clients, redirect with tokens in fragment
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = new URL('/auth/callback', frontendUrl);
      redirectUrl.hash = `access_token=${tokenPair.accessToken}&refresh_token=${tokenPair.refreshToken}&token_type=${tokenPair.tokenType}&expires_in=${tokenPair.expiresIn}`;

      res.redirect(redirectUrl.toString());
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = new URL('/auth/error', frontendUrl);
      errorUrl.searchParams.set(
        'error',
        error instanceof Error ? error.message : 'Authentication failed',
      );
      res.redirect(errorUrl.toString());
    }
  }

  @Post('google/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Google OAuth callback (POST)',
    description:
      'Exchange authorization code for tokens (for mobile/CLI clients)',
  })
  @ApiBody({ type: OAuthCallbackDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid authorization code or missing parameters',
    type: OAuthErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid state or authentication failed',
    type: OAuthErrorResponseDto,
  })
  async googleAuthCallbackPost(
    @Body() body: OAuthCallbackDto,
    @Req() _req: Request,
  ): Promise<TokenResponseDto> {
    // Validate state first
    const isValidState = await this.oauthStateService.validateState(body.state);
    if (!isValidState) {
      throw new UnauthorizedException('Invalid OAuth state - possible CSRF attack');
    }

    // Exchange authorization code for tokens
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3001/auth/google/callback',
    );

    try {
      // 1. Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: body.code,
          client_id: clientId || '',
          client_secret: clientSecret || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new UnauthorizedException(`Failed to exchange code: ${errorText}`);
      }

      const tokens = await tokenResponse.json();

      // 2. Get user profile
      const profileResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );

      if (!profileResponse.ok) {
        throw new UnauthorizedException('Failed to get user info from Google');
      }

      const profileData = await profileResponse.json();

      // 3. Construct profile
      const profile: GoogleProfile = {
        id: profileData.sub,
        email: profileData.email,
        displayName: profileData.name,
        avatarUrl: profileData.picture,
      };

      // 4. Execute use case
      const tokenPair = await this.googleOAuthUseCase.execute(profile, {
        ipAddress: this.getIpAddress(_req),
        userAgent: _req.headers['user-agent'],
        state: body.state, // Already consumed? No, validateState only checks, consumeState is in use case
      });

      // Note: useCase.execute CALLS consumeState.
      // But we called validateState above.
      // validateState (redis GET) does not remove it.
      // consumeState (redis DEL) removes it.
      // So this is correct.

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        tokenType: tokenPair.tokenType,
        expiresIn: tokenPair.expiresIn,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Google OAuth POST callback error:', error);
      throw new InternalServerErrorException('Authentication failed');
    }
  }

  @Get('state')
  @Public()
  @ApiOperation({
    summary: 'Generate OAuth state token',
    description: 'Generate a state token for CSRF protection in OAuth flows',
  })
  @ApiResponse({
    status: 200,
    description: 'State token generated',
    schema: {
      type: 'object',
      properties: {
        state: { type: 'string', example: 'abc123xyz...' },
      },
    },
  })
  async generateState(): Promise<{ state: string }> {
    const state = await this.oauthStateService.generateState();
    return { state };
  }

  // Apple Sign In Endpoints

  @Post('apple/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Apple Sign In callback',
    description: 'Exchange Apple identity token for Aki tokens',
  })
  @ApiBody({ type: AppleCallbackDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid identity token or missing parameters',
    type: OAuthErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid state or authentication failed',
    type: OAuthErrorResponseDto,
  })
  async appleAuthCallback(
    @Body() body: AppleCallbackDto,
    @Req() req: Request,
  ): Promise<TokenResponseDto> {
    // Parse user info if provided (only on first sign-in)
    let userInfo;
    if (body.user) {
      try {
        userInfo = typeof body.user === 'string' ? JSON.parse(body.user) : body.user;
      } catch {
        // Ignore parse errors, user info is optional
      }
    }

    const tokenPair = await this.appleSignInUseCase.execute(
      body.id_token,
      userInfo,
      {
        ipAddress: this.getIpAddress(req),
        userAgent: req.headers['user-agent'],
        state: body.state,
      },
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: tokenPair.tokenType,
      expiresIn: tokenPair.expiresIn,
    };
  }

  private getIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return req.socket.remoteAddress || '0.0.0.0';
  }
}
