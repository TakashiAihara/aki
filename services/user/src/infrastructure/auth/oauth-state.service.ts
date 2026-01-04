import { Injectable } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';
import * as crypto from 'crypto';

const STATE_PREFIX = 'oauth:state:';
const STATE_TTL_SECONDS = 600; // 10 minutes

@Injectable()
export class OAuthStateService {
  constructor(private readonly redisService: RedisService) {}

  async generateState(): Promise<string> {
    const state = crypto.randomBytes(32).toString('base64url');
    await this.redisService.set(
      `${STATE_PREFIX}${state}`,
      JSON.stringify({ createdAt: Date.now() }),
      STATE_TTL_SECONDS,
    );
    return state;
  }

  async validateState(state: string): Promise<boolean> {
    if (!state || state.length < 32) {
      return false;
    }

    const stored = await this.redisService.get(`${STATE_PREFIX}${state}`);
    return stored !== null;
  }

  async consumeState(state: string): Promise<boolean> {
    const key = `${STATE_PREFIX}${state}`;
    const stored = await this.redisService.get(key);

    if (!stored) {
      return false;
    }

    await this.redisService.del(key);
    return true;
  }
}
