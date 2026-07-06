import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';

const REVOKE_TTL_SECONDS = 15 * 60;

@Injectable()
export class TokenRevokeService {
  constructor(private readonly redis: RedisService) {}

  async revoke(userId: string): Promise<void> {
    await this.redis.set(`revoked:user:${userId}`, '1', REVOKE_TTL_SECONDS);
  }

  async isRevoked(userId: string): Promise<boolean> {
    const val = await this.redis.get(`revoked:user:${userId}`);
    return val !== null;
  }
}
