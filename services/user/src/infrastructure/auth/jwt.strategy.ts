import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { JwtPayload } from '@aki/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH', './keys/public.pem');

    let secretOrKey: string;
    try {
      secretOrKey = fs.readFileSync(publicKeyPath, 'utf8');
    } catch {
      // For testing without keys, use a fallback secret
      secretOrKey = configService.get<string>('JWT_SECRET', 'development-secret-key');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      algorithms: ['RS256', 'HS256'], // Support both for development
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      householdId: payload.householdId,
      role: payload.role || 'user',
      iat: payload.iat,
      exp: payload.exp,
      jti: payload.jti,
    };
  }
}
