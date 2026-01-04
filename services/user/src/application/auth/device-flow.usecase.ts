/**
 * Device Flow Use Case
 *
 * Implements OAuth 2.0 Device Authorization Grant (RFC 8628) for CLI authentication.
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DeviceCode, DeviceCodeStatus } from '@domain/entities/device-code.entity';
import { JwtService } from '@infrastructure/auth/jwt.service';
import { RefreshTokenService } from '@application/auth/refresh-token.service';
import { AuthEventService } from '@application/auth/auth-event.service';
import { USER_REPOSITORY, UserRepository } from '@domain/repositories/user.repository';
import { Inject } from '@nestjs/common';

// Device code constants per RFC 8628
const DEVICE_CODE_EXPIRY_SECONDS = 900; // 15 minutes
const POLLING_INTERVAL_SECONDS = 5;

// User code character set - excludes ambiguous characters (0, O, 1, I, L)
const USER_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const USER_CODE_LENGTH = 8; // XXXX-XXXX format

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface DeviceVerifyResponse {
  client_id: string;
  user_code: string;
  status: string;
}

export interface OAuth2Error {
  error: string;
  error_description?: string;
}

@Injectable()
export class DeviceFlowUseCase {
  private readonly validClientIds: string[];
  private readonly appUrl: string;

  constructor(
    @InjectRepository(DeviceCode)
    private readonly deviceCodeRepository: Repository<DeviceCode>,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly authEventService: AuthEventService,
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    this.validClientIds = (
      this.configService.get<string>('DEVICE_FLOW_CLIENT_IDS') || 'aki-cli'
    ).split(',');
    this.appUrl = this.configService.get<string>('APP_URL') || 'https://aki.app';
  }

  /**
   * Request a new device code for CLI authentication
   */
  async requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
    // Validate client ID
    if (!this.validClientIds.includes(clientId)) {
      throw new BadRequestException({
        error: 'invalid_client',
        error_description: 'Unknown client_id',
      });
    }

    // Generate device code (secure random)
    const deviceCode = crypto.randomBytes(32).toString('hex');

    // Generate user-friendly user code (XXXX-XXXX)
    const userCode = this.generateUserCode();

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + DEVICE_CODE_EXPIRY_SECONDS);

    // Create and save device code
    const deviceCodeEntity = this.deviceCodeRepository.create({
      deviceCode,
      userCode,
      clientId,
      expiresAt,
      status: DeviceCodeStatus.PENDING,
      interval: POLLING_INTERVAL_SECONDS,
    });

    await this.deviceCodeRepository.save(deviceCodeEntity);

    return {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${this.appUrl}/auth/device`,
      verification_uri_complete: `${this.appUrl}/auth/device?code=${userCode}`,
      expires_in: DEVICE_CODE_EXPIRY_SECONDS,
      interval: POLLING_INTERVAL_SECONDS,
    };
  }

  /**
   * Poll for token after user authorization
   */
  async pollForToken(deviceCode: string, clientId: string): Promise<TokenResponse> {
    // Find device code
    const deviceCodeEntity = await this.deviceCodeRepository.findOne({
      where: { deviceCode, clientId },
    });

    if (!deviceCodeEntity) {
      throw new HttpException(
        { error: 'invalid_grant', error_description: 'Device code not found' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check rate limiting
    if (!deviceCodeEntity.canPoll()) {
      throw new HttpException(
        { error: 'slow_down', error_description: 'Polling too frequently' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update last polled time
    await this.deviceCodeRepository.update(deviceCodeEntity.id, {
      lastPolledAt: new Date(),
    });

    // Check expiration
    if (deviceCodeEntity.isExpired()) {
      throw new HttpException(
        { error: 'expired_token', error_description: 'Device code has expired' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check status
    switch (deviceCodeEntity.status) {
      case DeviceCodeStatus.PENDING:
        throw new HttpException(
          { error: 'authorization_pending', error_description: 'User has not yet authorized' },
          HttpStatus.BAD_REQUEST,
        );

      case DeviceCodeStatus.DENIED:
        throw new HttpException(
          { error: 'access_denied', error_description: 'User denied authorization' },
          HttpStatus.BAD_REQUEST,
        );

      case DeviceCodeStatus.USED:
        throw new HttpException(
          { error: 'invalid_grant', error_description: 'Device code already used' },
          HttpStatus.BAD_REQUEST,
        );

      case DeviceCodeStatus.AUTHORIZED:
        // Generate tokens
        return this.generateTokensForDevice(deviceCodeEntity);

      default:
        throw new HttpException(
          { error: 'server_error', error_description: 'Unknown device code status' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  /**
   * Authorize a device code (called when user approves in web UI)
   */
  async authorizeDevice(userCode: string, userId: string): Promise<void> {
    const deviceCodeEntity = await this.findByUserCode(userCode);

    if (deviceCodeEntity.isExpired()) {
      throw new BadRequestException('Device code has expired');
    }

    if (deviceCodeEntity.status !== DeviceCodeStatus.PENDING) {
      throw new BadRequestException('Device code is no longer pending');
    }

    await this.deviceCodeRepository.update(deviceCodeEntity.id, {
      status: DeviceCodeStatus.AUTHORIZED,
      userId,
    });
  }

  /**
   * Deny a device code (called when user rejects in web UI)
   */
  async denyDevice(userCode: string): Promise<void> {
    const deviceCodeEntity = await this.findByUserCode(userCode);

    if (deviceCodeEntity.status !== DeviceCodeStatus.PENDING) {
      throw new BadRequestException('Device code is no longer pending');
    }

    await this.deviceCodeRepository.update(deviceCodeEntity.id, {
      status: DeviceCodeStatus.DENIED,
    });
  }

  /**
   * Get device code info by user code
   */
  async getDeviceInfo(userCode: string): Promise<DeviceVerifyResponse> {
    const deviceCodeEntity = await this.findByUserCode(userCode);

    return {
      client_id: deviceCodeEntity.clientId,
      user_code: deviceCodeEntity.userCode,
      status: deviceCodeEntity.status,
    };
  }

  /**
   * Find device code by user code
   */
  private async findByUserCode(userCode: string): Promise<DeviceCode> {
    const deviceCodeEntity = await this.deviceCodeRepository.findOne({
      where: { userCode: userCode.toUpperCase().replace('-', '') },
    });

    if (!deviceCodeEntity) {
      // Also try with hyphen
      const withHyphen = await this.deviceCodeRepository.findOne({
        where: { userCode: userCode.toUpperCase() },
      });

      if (!withHyphen) {
        throw new NotFoundException('Device code not found');
      }

      return withHyphen;
    }

    return deviceCodeEntity;
  }

  /**
   * Generate tokens for an authorized device
   */
  private async generateTokensForDevice(deviceCode: DeviceCode): Promise<TokenResponse> {
    if (!deviceCode.userId) {
      throw new HttpException(
        { error: 'server_error', error_description: 'No user associated with device code' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Get user
    const user = await this.userRepository.findById(deviceCode.userId);
    if (!user) {
      throw new HttpException(
        { error: 'server_error', error_description: 'User not found' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Generate tokens
    const tokenPair = await this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email,
      householdId: user.householdId || null,
    });

    // Store refresh token
    await this.refreshTokenService.storeRefreshToken(
      user.id,
      tokenPair.refreshToken,
      'cli',
    );

    // Mark device code as used
    await this.deviceCodeRepository.update(deviceCode.id, {
      status: DeviceCodeStatus.USED,
    });

    // Log successful authentication
    await this.authEventService.logLoginSuccess(user.id, 'device-flow', undefined, 'cli');

    return {
      access_token: tokenPair.accessToken,
      token_type: 'Bearer',
      expires_in: tokenPair.expiresIn,
      refresh_token: tokenPair.refreshToken,
    };
  }

  /**
   * Generate user-friendly code in XXXX-XXXX format
   */
  private generateUserCode(): string {
    let code = '';
    const randomBytes = crypto.randomBytes(USER_CODE_LENGTH);

    for (let i = 0; i < USER_CODE_LENGTH; i++) {
      code += USER_CODE_CHARS[randomBytes[i] % USER_CODE_CHARS.length];
    }

    // Insert hyphen in middle (XXXX-XXXX format)
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
}
