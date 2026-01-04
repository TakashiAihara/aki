import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

export interface AppleProfile {
  id: string;
  email: string;
  displayName?: string;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyLocation: configService.get<string>(
        'APPLE_PRIVATE_KEY_PATH',
        './keys/apple-auth-key.p8',
      ),
      callbackURL: configService.get<string>(
        'APPLE_CALLBACK_URL',
        'http://localhost:3001/auth/apple/callback',
      ),
      scope: ['name', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Express.Request,
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<void> {
    try {
      // Apple provides user info in the request body on first sign-in
      const userInfo = req.body?.user ? JSON.parse(req.body.user) : null;

      const appleProfile: AppleProfile = {
        id: profile.id || profile.sub,
        email: profile.email,
        displayName: userInfo
          ? `${userInfo.name?.firstName || ''} ${userInfo.name?.lastName || ''}`.trim()
          : undefined,
      };

      done(null, appleProfile);
    } catch (error) {
      done(error);
    }
  }
}
