import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtPayload } from '@akimi/shared';
import { TokenRefreshUseCase } from '@application/auth/token-refresh.usecase';
import { LogoutUseCase } from '@application/auth/logout.usecase';
import {
  TokenResponseDto,
  RefreshTokenRequestDto,
  RevokeTokenRequestDto,
} from '../dto/token.dto';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('tokens')
@Controller('tokens')
export class TokenController {
  constructor(
    private readonly tokenRefreshUseCase: TokenRefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange a valid refresh token for a new token pair',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body() body: RefreshTokenRequestDto,
    @Req() req: Request,
  ): Promise<TokenResponseDto> {
    const tokenPair = await this.tokenRefreshUseCase.execute(
      body.refreshToken,
      {
        ipAddress: this.getIpAddress(req),
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: tokenPair.tokenType,
      expiresIn: tokenPair.expiresIn,
    };
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke a refresh token',
    description: 'Revoke a specific refresh token (logout from one device)',
  })
  @ApiBody({ type: RevokeTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token revoked successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async revoke(
    @Body() body: RevokeTokenRequestDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.logoutUseCase.logout(body.refreshToken, user, {
      ipAddress: this.getIpAddress(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('revoke-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke all refresh tokens',
    description: 'Revoke all refresh tokens for the current user (logout everywhere)',
  })
  @ApiResponse({
    status: 200,
    description: 'All tokens revoked',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'All tokens revoked' },
        count: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async revokeAll(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string; count: number }> {
    return this.logoutUseCase.logoutAll(user, {
      ipAddress: this.getIpAddress(req),
      userAgent: req.headers['user-agent'],
    });
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
