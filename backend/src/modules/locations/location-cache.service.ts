import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

export interface TechnicianPosition {
  lat: number;
  lng: number;
  timestamp: number;
  orderId?: string;
}

const POSITION_TTL_SECONDS = 300;
const ACTIVE_TECH_SET_KEY = 'location:active:techs';

@Injectable()
export class LocationCacheService {
  private readonly logger = new Logger(LocationCacheService.name);

  constructor(private readonly redis: RedisService) {}

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

    if (ids.length === 0) return map;

    const keys = ids.map((id) => `location:tech:${id}`);
    const rawPositions = await this.redis.getClient().mget(...keys);

    for (let i = 0; i < ids.length; i++) {
      const raw = rawPositions[i];
      if (!raw) continue;
      try {
        const pos = JSON.parse(raw) as TechnicianPosition;
        map.set(ids[i], pos);
      } catch {
        this.logger.warn(`Invalid position data for technician ${ids[i]}`);
      }
    }

    return map;
  }
}
