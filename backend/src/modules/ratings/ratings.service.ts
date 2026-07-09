import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import {
  NotFoundAppException,
  ForbiddenAppException,
  BadRequestAppException,
} from '../common/errors/app-exception.js';
import { ScopingService } from '../common/services/scoping.service.js';
import { handlePrismaError } from '../common/utils/prisma-error.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';
import type { CreateRatingDto } from './dto/create-rating.dto.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopingService: ScopingService,
  ) {}

  async create(
    workOrderId: string,
    dto: CreateRatingDto,
    user: AuthenticatedUser,
  ) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        customerId: true,
        technicianId: true,
        status: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundAppException('Work order');
    }

    if (workOrder.customerId !== user.id) {
      throw new ForbiddenAppException('You can only rate your own work orders');
    }

    if (workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new BadRequestAppException('Work order is not yet completed');
    }

    const technicianId = workOrder.technicianId;
    if (!technicianId) {
      throw new BadRequestAppException(
        'No technician assigned to this work order',
      );
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const rating = await tx.rating.create({
          data: {
            workOrderId,
            customerId: user.id,
            technicianId,
            score: dto.score,
            comment: dto.comment ?? null,
          },
        });

        const [count, agg] = await Promise.all([
          tx.rating.count({ where: { technicianId } }),
          tx.rating.aggregate({
            where: { technicianId },
            _avg: { score: true },
          }),
        ]);

        await tx.technician.update({
          where: { id: technicianId },
          data: {
            ratingAvg: +(agg._avg.score ?? 0).toFixed(2),
            ratingCount: count,
          },
        });

        return rating;
      });

      return result;
    } catch (err) {
      handlePrismaError(
        err,
        'This work order has already been rated',
        'Technician no longer exists',
      );
    }
  }

  async findByWorkOrder(workOrderId: string, user: AuthenticatedUser) {
    const scope = await this.scopingService.applyWorkOrderScope(user);

    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, ...scope },
      select: { id: true },
    });

    if (!workOrder) {
      throw new NotFoundAppException('Work order');
    }

    const rating = await this.prisma.rating.findUnique({
      where: { workOrderId },
    });

    return rating ?? null;
  }

  async delete(ratingId: string, user: AuthenticatedUser) {
    const rating = await this.prisma.rating.findUnique({
      where: { id: ratingId },
      select: { id: true, workOrderId: true },
    });

    if (!rating) {
      throw new NotFoundAppException('Rating');
    }

    const scope = await this.scopingService.applyWorkOrderScope(user);
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: rating.workOrderId, ...scope },
      select: { id: true },
    });

    if (!workOrder) {
      throw new NotFoundAppException('Work order');
    }

    await this.prisma.rating.delete({ where: { id: ratingId } });
  }
}
