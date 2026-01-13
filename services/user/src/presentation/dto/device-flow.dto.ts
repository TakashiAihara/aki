/**
 * Device Flow DTOs
 *
 * Request and response DTOs for OAuth 2.0 Device Authorization Grant.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class DeviceCodeRequestDto {
  @ApiProperty({
    description: 'Client identifier',
    example: 'aki-cli',
  })
  @IsString()
  @IsNotEmpty()
  client_id!: string;

  @ApiProperty({
    description: 'Requested scope (optional)',
    example: 'openid profile',
    required: false,
  })
  @IsString()
  @IsOptional()
  scope?: string;
}

export class DeviceCodeResponseDto {
  @ApiProperty({
    description: 'Device verification code (used by CLI to poll)',
    example: 'a1b2c3d4e5f6...',
  })
  device_code!: string;

  @ApiProperty({
    description: 'User code to display (user enters this in browser)',
    example: 'ABCD-1234',
  })
  user_code!: string;

  @ApiProperty({
    description: 'URL for user to visit',
    example: 'https://aki.app/auth/device',
  })
  verification_uri!: string;

  @ApiProperty({
    description: 'Complete URL with code pre-filled',
    example: 'https://aki.app/auth/device?code=ABCD-1234',
  })
  verification_uri_complete!: string;

  @ApiProperty({
    description: 'Seconds until device code expires',
    example: 900,
  })
  expires_in!: number;

  @ApiProperty({
    description: 'Minimum polling interval in seconds',
    example: 5,
  })
  interval!: number;
}

export class DeviceTokenRequestDto {
  @ApiProperty({
    description: 'Grant type (must be device_code)',
    example: 'urn:ietf:params:oauth:grant-type:device_code',
  })
  @IsString()
  @IsNotEmpty()
  grant_type!: string;

  @ApiProperty({
    description: 'Device code from initial request',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  device_code!: string;

  @ApiProperty({
    description: 'Client identifier',
    example: 'aki-cli',
  })
  @IsString()
  @IsNotEmpty()
  client_id!: string;
}

export class DeviceTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  token_type!: string;

  @ApiProperty({
    description: 'Seconds until access token expires',
    example: 900,
  })
  expires_in!: number;

  @ApiProperty({
    description: 'Refresh token',
    example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
  })
  refresh_token!: string;
}

export class DeviceAuthorizeRequestDto {
  @ApiProperty({
    description: 'User code to authorize',
    example: 'ABCD-1234',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i, {
    message: 'User code must be in XXXX-XXXX format',
  })
  user_code!: string;
}

export class DeviceVerifyResponseDto {
  @ApiProperty({
    description: 'Client identifier',
    example: 'aki-cli',
  })
  client_id!: string;

  @ApiProperty({
    description: 'User code',
    example: 'ABCD-1234',
  })
  user_code!: string;

  @ApiProperty({
    description: 'Current status',
    enum: ['pending', 'authorized', 'denied', 'used'],
    example: 'pending',
  })
  status!: string;
}

export class OAuth2ErrorResponseDto {
  @ApiProperty({
    description: 'Error code per RFC 8628',
    example: 'authorization_pending',
    enum: [
      'authorization_pending',
      'slow_down',
      'access_denied',
      'expired_token',
      'invalid_grant',
      'invalid_client',
      'unsupported_grant_type',
    ],
  })
  error!: string;

  @ApiProperty({
    description: 'Human-readable error description',
    example: 'User has not yet authorized',
    required: false,
  })
  error_description?: string;
}
