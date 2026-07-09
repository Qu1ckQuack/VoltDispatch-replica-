import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class TokenRevokeService {
  private readonly revokeTtlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    configService: ConfigService,
  ) {
    const refreshExpiry = configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
    this.revokeTtlSeconds = this.parseExpiryToSeconds(refreshExpiry);
  }

  async revoke(userId: string): Promise<void> {
    await this.redis.set(`revoked:user:${userId}`, '1', this.revokeTtlSeconds);
  }

  async isRevoked(userId: string): Promise<boolean> {
    const val = await this.redis.get(`revoked:user:${userId}`);
    return val !== null;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}
