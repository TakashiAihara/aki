import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

const BLACKLIST_PREFIX = 'token:blacklist:';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Add a token JTI to the blacklist
   * @param jti The JWT ID to blacklist
   * @param ttlSeconds Time to live in seconds (should match token expiry)
   */
  async addToBlacklist(jti: string, ttlSeconds: number): Promise<void> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    await this.redisService.set(key, '1', ttlSeconds);
  }

  /**
   * Check if a token JTI is blacklisted
   * @param jti The JWT ID to check
   * @returns true if blacklisted, false otherwise
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    return this.redisService.exists(key);
  }

  /**
   * Remove a token JTI from the blacklist (rarely needed)
   * @param jti The JWT ID to remove
   */
  async removeFromBlacklist(jti: string): Promise<void> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    await this.redisService.del(key);
  }

  /**
   * Get all blacklisted tokens (for debugging/monitoring)
   * @returns Array of blacklisted JTIs
   */
  async getAllBlacklisted(): Promise<string[]> {
    const keys = await this.redisService.keys(`${BLACKLIST_PREFIX}*`);
    return keys.map(key => key.replace(BLACKLIST_PREFIX, ''));
  }
}
