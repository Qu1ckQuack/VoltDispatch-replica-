import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { InjectQueue } from '../bullmq/helpers.js';
import { SLA_TIMER_QUEUE_NAME } from '../bullmq/queues/sla-timer.queue.js';
import { buildBullmqConnectionOptions } from '../common/utils/redis-connection.js';
import { WORK_ORDER_NUMBER_LENGTH } from '../common/constants.js';
import { PrismaService } from '../common/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  NotificationChannel,
  WorkOrderStatus,
} from '../../generated/prisma/enums.js';

const SLA_WARNING_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class SlaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlaService.name);
  private worker: Worker | null = null;

  constructor(
    @InjectQueue(SLA_TIMER_QUEUE_NAME)
    private readonly slaTimerQueue: Queue,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerRepeatableJob();
    this.startWorker();
    this.logger.log('SLA timer service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async registerRepeatableJob(): Promise<void> {
    const repeatableJobs = await this.slaTimerQueue.getRepeatableJobs();
    const exists = repeatableJobs.some(
      (j) => j.name === 'sla-check' && j.pattern === '*/5 * * * *',
    );

    if (!exists) {
      await this.slaTimerQueue.add(
        'sla-check',
        { type: 'check_approaching_deadlines' },
        {
          repeat: { pattern: '*/5 * * * *' },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log('Registered SLA check repeatable job (every 5 minutes)');
    }
  }

  private startWorker(): void {
    this.worker = new Worker(
      SLA_TIMER_QUEUE_NAME,
      async (job) => {
        const data = job.data as { type: string };
        if (data.type === 'check_approaching_deadlines') {
          await this.checkApproachingDeadlines();
        }
      },
      {
        connection: buildBullmqConnectionOptions(this.config),
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`SLA check job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`SLA check job ${job?.id} failed: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      this.logger.error(`SLA worker error: ${err.message}`);
    });
  }

  async checkApproachingDeadlines(): Promise<void> {
    const warningThreshold = new Date(Date.now() + SLA_WARNING_WINDOW_MS);

    const approachingOrders = await this.prisma.workOrder.findMany({
      where: {
        slaDeadline: {
          lte: warningThreshold,
          gte: new Date(),
        },
        status: {
          notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
        },
      },
      include: {
        dealer: { select: { userId: true } },
        technician: { select: { userId: true } },
      },
    });

    this.logger.debug(
      `Found ${approachingOrders.length} orders approaching SLA deadline`,
    );

    for (const order of approachingOrders) {
      if (order.technician?.userId) {
        await this.notificationsService.enqueue(
          order.id,
          NotificationChannel.LINE,
          'sla_warning',
          {
            workOrderNumber: order.id.slice(0, WORK_ORDER_NUMBER_LENGTH),
            slaDeadline: order.slaDeadline?.toISOString(),
          },
          order.technician.userId,
        );
      }

      if (order.dealer.userId) {
        await this.notificationsService.enqueue(
          order.id,
          NotificationChannel.EMAIL,
          'sla_warning',
          {
            workOrderNumber: order.id.slice(0, WORK_ORDER_NUMBER_LENGTH),
            slaDeadline: order.slaDeadline?.toISOString(),
          },
          order.dealer.userId,
        );
      }
    }
  }
}
