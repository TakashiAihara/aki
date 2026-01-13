import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Opaque refresh token for obtaining new access tokens',
    example: 'dGVzdC1yZWZyZXNoLXRva2Vu...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Token type (always "Bearer")',
    example: 'Bearer',
  })
  tokenType!: 'Bearer';

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 900,
  })
  expiresIn!: number;
}

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'Authorization code from OAuth provider',
    example: '4/0AX4XfWh...',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'OAuth state parameter for CSRF protection',
    example: 'abc123xyz...',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;
}

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'Refresh token to exchange for new tokens',
    example: 'dGVzdC1yZWZyZXNoLXRva2Vu...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class RevokeTokenRequestDto {
  @ApiProperty({
    description: 'Refresh token to revoke',
    example: 'dGVzdC1yZWZyZXNoLXRva2Vu...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class OAuthErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 401,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid OAuth state - possible CSRF attack',
  })
  message!: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Unauthorized',
  })
  error!: string;
}

export class AppleCallbackDto {
  @ApiProperty({
    description: 'Apple identity token (JWT)',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  id_token!: string;

  @ApiPropertyOptional({
    description: 'Authorization code from Apple (optional)',
    example: 'c1234567890abcdef',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'OAuth state parameter for CSRF protection',
    example: 'abc123xyz...',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiPropertyOptional({
    description: 'User info JSON (only provided on first authorization)',
    example: '{"name":{"firstName":"John","lastName":"Doe"},"email":"john@example.com"}',
  })
  @IsString()
  @IsOptional()
  user?: string;
}
