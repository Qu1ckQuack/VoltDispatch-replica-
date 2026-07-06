import { Queue, type ConnectionOptions } from 'bullmq';

export const SLA_TIMER_QUEUE_NAME = 'sla-timer';

export interface SlaTimerJobData {
  type: 'check_approaching_deadlines';
}

export function createSlaTimerQueue(connection: ConnectionOptions): Queue {
  return new Queue(SLA_TIMER_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
}
