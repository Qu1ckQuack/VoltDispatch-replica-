import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { ScopingService } from '../common/services/scoping.service.js';
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
      throw new NotFoundException('Work order not found');
    }

    if (workOrder.customerId !== user.id) {
      throw new ForbiddenException('You can only rate your own work orders');
    }

    if (workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Work order is not yet completed');
    }

    const technicianId = workOrder.technicianId;
    if (!technicianId) {
      throw new BadRequestException(
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
      if (err instanceof Error && 'code' in err) {
        const prismaErr = err as { code: string };
        if (prismaErr.code === 'P2002') {
          throw new ConflictException('This work order has already been rated');
        }
        if (prismaErr.code === 'P2025') {
          throw new NotFoundException('Technician no longer exists');
        }
      }
      throw err;
    }
  }

  async findByWorkOrder(workOrderId: string, user: AuthenticatedUser) {
    const scope = await this.scopingService.applyWorkOrderScope(user);

    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, ...scope },
      select: { id: true },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
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
      throw new NotFoundException('Rating not found');
    }

    const scope = await this.scopingService.applyWorkOrderScope(user);
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: rating.workOrderId, ...scope },
      select: { id: true },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    await this.prisma.rating.delete({ where: { id: ratingId } });
  }
}
