import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';

export interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email: string;
  email_verified: string;
  is_private_email?: string;
  auth_time: number;
  nonce_supported?: boolean;
}

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

@Injectable()
export class AppleTokenService {
  private jwks: jose.JWTVerifyGetKey | null = null;
  private jwksLastFetched: number = 0;
  private readonly jwksCacheDuration = 3600000; // 1 hour

  constructor(private readonly configService: ConfigService) {}

  async verifyIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
    try {
      const jwks = await this.getJWKS();
      const clientId = this.configService.get<string>('APPLE_CLIENT_ID');

      const { payload } = await jose.jwtVerify(identityToken, jwks, {
        issuer: APPLE_ISSUER,
        audience: clientId,
      });

      const applePayload = payload as unknown as AppleTokenPayload;

      // Validate required claims
      if (!applePayload.sub) {
        throw new UnauthorizedException('Invalid Apple identity token: missing subject');
      }

      if (!applePayload.email) {
        throw new UnauthorizedException('Invalid Apple identity token: missing email');
      }

      // Validate email is verified
      if (applePayload.email_verified !== 'true') {
        throw new UnauthorizedException('Apple email is not verified');
      }

      return applePayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof jose.errors.JWTExpired) {
        throw new UnauthorizedException('Apple identity token has expired');
      }
      if (error instanceof jose.errors.JWTClaimValidationFailed) {
        throw new UnauthorizedException('Invalid Apple identity token claims');
      }
      throw new UnauthorizedException('Failed to verify Apple identity token');
    }
  }

  private async getJWKS(): Promise<jose.JWTVerifyGetKey> {
    const now = Date.now();

    if (this.jwks && now - this.jwksLastFetched < this.jwksCacheDuration) {
      return this.jwks;
    }

    this.jwks = jose.createRemoteJWKSet(new URL(APPLE_KEYS_URL));
    this.jwksLastFetched = now;

    return this.jwks;
  }

  isPrivateRelayEmail(email: string): boolean {
    return email.includes('@privaterelay.appleid.com');
  }
}
