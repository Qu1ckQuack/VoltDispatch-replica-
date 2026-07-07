import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { buildRedisUrl } from '../common/utils/redis-connection.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly config: ConfigService;
  private subscriberClient: Redis | null = null;

  constructor(config: ConfigService) {
    this.config = config;
    const redisUrl = buildRedisUrl(config);
    this.client = new Redis(redisUrl);
    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
      this.subscriberClient = null;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  createSubscriber(): Redis {
    if (!this.subscriberClient) {
      const redisUrl = buildRedisUrl(this.config);
      this.subscriberClient = new Redis(redisUrl);
      this.subscriberClient.on('error', (err) => {
        this.logger.error('Redis subscriber error', err);
      });
    }
    return this.subscriberClient;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }
}
