import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { JwtPayload, TokenPair } from '@akimi/shared';

@Injectable()
export class JwtService {
  private privateKey!: jose.KeyLike;
  private publicKey!: jose.KeyLike;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(private readonly configService: ConfigService) {
    this.accessTokenExpiry = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY', '15m');
    this.refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY', '7d');
  }

  async onModuleInit(): Promise<void> {
    const privateKeyPath = this.configService.get<string>(
      'JWT_PRIVATE_KEY_PATH',
      './keys/private.pem',
    );
    const publicKeyPath = this.configService.get<string>(
      'JWT_PUBLIC_KEY_PATH',
      './keys/public.pem',
    );

    try {
      const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
      const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');

      this.privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
      this.publicKey = await jose.importSPKI(publicKeyPem, 'RS256');
    } catch {
      // For development/testing, generate ephemeral keys if files don't exist
      console.warn('JWT keys not found, generating ephemeral keys for development');
      const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  async generateTokenPair(
    userId: string,
    email: string,
    householdId?: string,
    role: 'user' | 'admin' = 'user',
  ): Promise<TokenPair> {
    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Generate access token
    const accessToken = await new jose.SignJWT({
      email,
      householdId,
      role,
      jti,
    } as Partial<JwtPayload>)
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject(userId)
      .setIssuedAt(now)
      .setExpirationTime(this.accessTokenExpiry)
      .sign(this.privateKey);

    // Generate refresh token (opaque, 256-bit random)
    const refreshToken = crypto.randomBytes(32).toString('base64url');

    // Parse expiry to seconds
    const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const { payload } = await jose.jwtVerify(token, this.publicKey, {
      algorithms: ['RS256'],
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      householdId: payload.householdId as string | undefined,
      role: (payload.role as 'user' | 'admin') || 'user',
      iat: payload.iat as number,
      exp: payload.exp as number,
      jti: payload.jti as string,
    };
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getPublicKey(): jose.KeyLike {
    return this.publicKey;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default to 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
