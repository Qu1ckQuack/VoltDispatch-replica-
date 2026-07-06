import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RedisService } from '../redis/redis.service.js';

export interface TechnicianPosition {
  lat: number;
  lng: number;
  timestamp: number;
  orderId?: string;
}

const POSITION_TTL_SECONDS = 300;
const ACTIVE_TECH_SET_KEY = 'location:active:techs';
const LOCATION_UPDATES_CHANNEL = 'location:updates';

@Injectable()
export class LocationCacheService {
  private readonly logger = new Logger(LocationCacheService.name);
  private readonly publisher: Redis;

  constructor(
    private readonly redis: RedisService,
    configService: ConfigService,
  ) {
    const restUrl = configService.getOrThrow<string>('UPSTASH_REDIS_REST_URL');
    const token = configService.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN');
    const host = new URL(restUrl).hostname;
    const redisUrl = `rediss://default:${encodeURIComponent(token)}@${host}:6379`;
    this.publisher = new Redis(redisUrl);
  }

  async setPosition(
    technicianId: string,
    lat: number,
    lng: number,
    orderId?: string,
  ): Promise<void> {
    const position: TechnicianPosition = {
      lat,
      lng,
      timestamp: Date.now(),
      orderId,
    };

    const client = this.redis.getClient();
    await Promise.all([
      client.setex(
        `location:tech:${technicianId}`,
        POSITION_TTL_SECONDS,
        JSON.stringify(position),
      ),
      client.sadd(ACTIVE_TECH_SET_KEY, technicianId),
    ]);
  }

  async getPosition(technicianId: string): Promise<TechnicianPosition | null> {
    const raw = await this.redis.get(`location:tech:${technicianId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TechnicianPosition;
    } catch {
      this.logger.warn(`Invalid position data for technician ${technicianId}`);
      return null;
    }
  }

  async getActiveTechnicianIds(): Promise<string[]> {
    return this.redis.getClient().smembers(ACTIVE_TECH_SET_KEY);
  }

  async getActivePositions(): Promise<Map<string, TechnicianPosition>> {
    const ids = await this.getActiveTechnicianIds();
    const map = new Map<string, TechnicianPosition>();

    for (const id of ids) {
      const pos = await this.getPosition(id);
      if (pos) {
        map.set(id, pos);
      }
    }

    return map;
  }

  async publishPosition(
    technicianId: string,
    lat: number,
    lng: number,
    orderId?: string,
  ): Promise<void> {
    const message = JSON.stringify({
      technicianId,
      lat,
      lng,
      timestamp: Date.now(),
      orderId,
    });
    await this.publisher.publish(LOCATION_UPDATES_CHANNEL, message);
  }
}
