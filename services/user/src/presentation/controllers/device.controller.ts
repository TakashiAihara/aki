/**
 * Device Controller
 *
 * Handles OAuth 2.0 Device Authorization Grant endpoints for CLI authentication.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtPayload } from '@aki/shared';
import { DeviceFlowUseCase } from '@application/auth/device-flow.usecase';
import {
  DeviceCodeRequestDto,
  DeviceCodeResponseDto,
  DeviceTokenRequestDto,
  DeviceTokenResponseDto,
  DeviceAuthorizeRequestDto,
  DeviceVerifyResponseDto,
  OAuth2ErrorResponseDto,
} from '../dto/device-flow.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

@ApiTags('auth/device')
@Controller('auth/device')
export class DeviceController {
  constructor(private readonly deviceFlowUseCase: DeviceFlowUseCase) {}

  @Post('code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request device code',
    description: 'Request a device code for CLI authentication (RFC 8628)',
  })
  @ApiResponse({
    status: 200,
    description: 'Device code generated',
    type: DeviceCodeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid client_id',
    type: OAuth2ErrorResponseDto,
  })
  async requestDeviceCode(
    @Body() body: DeviceCodeRequestDto,
  ): Promise<DeviceCodeResponseDto> {
    return this.deviceFlowUseCase.requestDeviceCode(body.client_id);
  }

  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Poll for token',
    description: 'Poll for access token after user authorization (RFC 8628)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens issued',
    type: DeviceTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Authorization pending, slow down, access denied, or expired',
    type: OAuth2ErrorResponseDto,
  })
  async pollForToken(
    @Body() body: DeviceTokenRequestDto,
  ): Promise<DeviceTokenResponseDto> {
    // Validate grant type
    if (body.grant_type !== DEVICE_CODE_GRANT_TYPE) {
      throw new BadRequestException({
        error: 'unsupported_grant_type',
        error_description: 'Grant type must be urn:ietf:params:oauth:grant-type:device_code',
      });
    }

    return this.deviceFlowUseCase.pollForToken(body.device_code, body.client_id);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify user code',
    description: 'Get device code info by user code (for web authorization page)',
  })
  @ApiQuery({
    name: 'code',
    description: 'User code (XXXX-XXXX format)',
    example: 'ABCD-1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Device code info',
    type: DeviceVerifyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device code not found',
  })
  async verifyDeviceCode(
    @Query('code') code: string,
  ): Promise<DeviceVerifyResponseDto> {
    return this.deviceFlowUseCase.getDeviceInfo(code);
  }

  @Post('authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authorize device',
    description: 'Authorize a device code (user approves CLI authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Device authorized',
  })
  @ApiResponse({
    status: 400,
    description: 'Device code expired or already processed',
  })
  @ApiResponse({
    status: 404,
    description: 'Device code not found',
  })
  async authorizeDevice(
    @CurrentUser() user: JwtPayload,
    @Body() body: DeviceAuthorizeRequestDto,
  ): Promise<{ message: string }> {
    await this.deviceFlowUseCase.authorizeDevice(body.user_code, user.sub);
    return { message: 'Device authorized successfully' };
  }

  @Post('deny')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deny device',
    description: 'Deny a device code (user rejects CLI authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Device denied',
  })
  @ApiResponse({
    status: 400,
    description: 'Device code already processed',
  })
  @ApiResponse({
    status: 404,
    description: 'Device code not found',
  })
  async denyDevice(
    @Body() body: DeviceAuthorizeRequestDto,
  ): Promise<{ message: string }> {
    await this.deviceFlowUseCase.denyDevice(body.user_code);
    return { message: 'Device authorization denied' };
  }
}
