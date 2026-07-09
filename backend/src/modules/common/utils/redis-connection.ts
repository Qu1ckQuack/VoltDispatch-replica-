import { ConfigService } from '@nestjs/config';
import { type ConnectionOptions } from 'bullmq';

export function buildRedisHost(config: ConfigService): string {
  const restUrl = config.getOrThrow<string>('UPSTASH_REDIS_REST_URL');
  return new URL(restUrl).hostname;
}

export function buildRedisToken(config: ConfigService): string {
  return config.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN');
}

export function buildRedisUrl(config: ConfigService): string {
  const token = buildRedisToken(config);
  const host = buildRedisHost(config);
  return `rediss://default:${encodeURIComponent(token)}@${host}:6379`;
}

export function buildBullmqConnectionOptions(
  config: ConfigService,
): ConnectionOptions {
  const token = buildRedisToken(config);
  const host = buildRedisHost(config);
  return {
    host,
    port: 6379,
    tls: {},
    password: token,
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
  };
}
