import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type ConnectionOptions } from 'bullmq';
import {
  createNotificationQueue,
  NOTIFICATION_QUEUE_NAME,
} from './queues/notification.queue.js';
import {
  createSlaTimerQueue,
  SLA_TIMER_QUEUE_NAME,
} from './queues/sla-timer.queue.js';

export function buildRedisConnectionOptions(
  config: ConfigService,
): ConnectionOptions {
  const restUrl = config.getOrThrow<string>('UPSTASH_REDIS_REST_URL');
  const token = config.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN');
  const host = new URL(restUrl).hostname;
  return {
    host,
    port: 6379,
    tls: {},
    password: token,
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
  };
}

@Global()
@Module({
  providers: [
    {
      provide: NOTIFICATION_QUEUE_NAME,
      useFactory: (config: ConfigService) =>
        createNotificationQueue(buildRedisConnectionOptions(config)),
      inject: [ConfigService],
    },
    {
      provide: SLA_TIMER_QUEUE_NAME,
      useFactory: (config: ConfigService) =>
        createSlaTimerQueue(buildRedisConnectionOptions(config)),
      inject: [ConfigService],
    },
  ],
  exports: [NOTIFICATION_QUEUE_NAME, SLA_TIMER_QUEUE_NAME],
})
export class BullmqModule implements OnModuleDestroy {
  constructor(
    @Inject(NOTIFICATION_QUEUE_NAME)
    private readonly notificationQueue: Queue,
    @Inject(SLA_TIMER_QUEUE_NAME)
    private readonly slaTimerQueue: Queue,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.notificationQueue.close(),
      this.slaTimerQueue.close(),
    ]);
  }
}

export { NOTIFICATION_QUEUE_NAME, SLA_TIMER_QUEUE_NAME };
export type { NotificationJobData } from './queues/notification.queue.js';
export type { SlaTimerJobData } from './queues/sla-timer.queue.js';
