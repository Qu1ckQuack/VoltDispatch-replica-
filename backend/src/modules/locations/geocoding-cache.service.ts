import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import * as crypto from 'node:crypto';

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

const GEOCODE_TTL_SECONDS = 86400;

@Injectable()
export class GeocodingCacheService {
  private readonly logger = new Logger(GeocodingCacheService.name);

  constructor(private readonly redis: RedisService) {}

  private hashAddress(address: string): string {
    return crypto
      .createHash('sha256')
      .update(address.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16);
  }

  async getCached(address: string): Promise<GeocodingResult | null> {
    const key = `geocode:addr:${this.hashAddress(address)}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GeocodingResult;
    } catch {
      this.logger.warn(`Invalid geocoding cache data for address: ${address}`);
      return null;
    }
  }

  async setCache(address: string, result: GeocodingResult): Promise<void> {
    const key = `geocode:addr:${this.hashAddress(address)}`;
    await this.redis.set(key, JSON.stringify(result), GEOCODE_TTL_SECONDS);
  }
}
