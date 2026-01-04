import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { JwtService } from '@infrastructure/auth/jwt.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenService {
  private readonly tokenExpiryDays: number;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.tokenExpiryDays = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRY_DAYS',
      7,
    );
  }

  async storeToken(
    userId: string,
    token: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const tokenHash = this.jwtService.hashRefreshToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.tokenExpiryDays);

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async validateToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = this.jwtService.hashRefreshToken(token);

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.isExpired() || refreshToken.revokedAt) {
      return null;
    }

    return refreshToken;
  }

  async revokeToken(token: string): Promise<boolean> {
    const tokenHash = this.jwtService.hashRefreshToken(token);

    const result = await this.refreshTokenRepository.update(
      { tokenHash },
      { revokedAt: new Date() },
    );

    return (result.affected ?? 0) > 0;
  }

  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.refreshTokenRepository.update(
      { userId, revokedAt: undefined },
      { revokedAt: new Date() },
    );

    return result.affected ?? 0;
  }

  async rotateToken(
    oldToken: string,
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<{ newToken: string; refreshToken: RefreshToken } | null> {
    // Revoke old token
    const revoked = await this.revokeToken(oldToken);
    if (!revoked) {
      return null;
    }

    // Generate new token (random bytes, not JWT)
    const crypto = await import('crypto');
    const newToken = crypto.randomBytes(32).toString('base64url');

    // Store new token
    const refreshToken = await this.storeToken(
      userId,
      newToken,
      ipAddress,
      userAgent,
    );

    return { newToken, refreshToken };
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  async getActiveTokensForUser(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: {
        userId,
        revokedAt: undefined,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
