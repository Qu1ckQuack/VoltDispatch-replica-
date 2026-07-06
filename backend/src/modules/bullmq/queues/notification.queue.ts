import { Queue, type ConnectionOptions } from 'bullmq';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export interface NotificationJobData {
  notificationId: string;
  channel: 'EMAIL' | 'LINE';
  type: string;
  payload: Record<string, unknown>;
  recipientId: string;
}

export function createNotificationQueue(connection: ConnectionOptions): Queue {
  return new Queue(NOTIFICATION_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
}
