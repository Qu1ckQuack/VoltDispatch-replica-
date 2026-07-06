import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly config: ConfigService;
  private subscriberClient: Redis | null = null;

  constructor(config: ConfigService) {
    this.config = config;
    const restUrl = config.getOrThrow<string>('UPSTASH_REDIS_REST_URL');
    const token = config.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN');
    const host = new URL(restUrl).hostname;
    const redisUrl = `rediss://default:${encodeURIComponent(token)}@${host}:6379`;
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
      const restUrl = this.config.getOrThrow<string>('UPSTASH_REDIS_REST_URL');
      const token = this.config.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN');
      const host = new URL(restUrl).hostname;
      const redisUrl = `rediss://default:${encodeURIComponent(token)}@${host}:6379`;
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
}
