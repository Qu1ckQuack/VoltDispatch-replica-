import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../common/prisma.service.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';
import { DEFAULT_PAGE_LIMIT, SEVEN_DAYS_MS } from '../common/constants.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import type { SummaryQueryDto } from './dto/summary-query.dto.js';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(currentUser: AuthenticatedUser) {
    const role = currentUser.role;
    const isScoped = role === 'TECHNICIAN' || role === 'DEALER';
    const scopeField = role === 'TECHNICIAN' ? 'id' : 'id';
    const scopeId = isScoped ? currentUser.profileId : null;

    const queries = [
      this.getAggregatedMetrics(scopeId, scopeField).catch((metricsError) => {
        this.logger.error(`Failed to fetch metrics:`, metricsError);
        return null;
      }),
      ...(isScoped
        ? [Promise.resolve()]
        : [
            this.getDailyByStatusRaw().catch((dailyError) => {
              this.logger.error(`Failed to fetch daily by status:`, dailyError);
              return null;
            }),
          ]),
      this.getPendingLast7Days(scopeId, scopeField).catch((pendingError) => {
        this.logger.error(`Failed to fetch pending orders:`, pendingError);
        return null;
      }),
      this.getRecentlyCompleted(scopeId, scopeField).catch((completedError) => {
        this.logger.error(
          `Failed to fetch recently completed:`,
          completedError,
        );
        return null;
      }),
      ...(isScoped
        ? [Promise.resolve()]
        : [
            this.getTechnicianWorkload().catch((workloadError) => {
              this.logger.error(
                `Failed to fetch technician workload:`,
                workloadError,
              );
              return null;
            }),
          ]),
      this.getRecentActivities(scopeId, scopeField).catch((activityError) => {
        this.logger.error(`Failed to fetch recent activities:`, activityError);
        return null;
      }),
    ] as const;

    const [
      metrics,
      dailyByStatus,
      pendingLast7Days,
      recentlyCompleted,
      technicianWorkload,
      recentActivities,
    ] = await Promise.all(queries);

    return {
      totalOrders: metrics?.totalOrders ?? 0,
      activeOrders:
        (metrics?.pendingOrders ?? 0) + (metrics?.inProcessOrders ?? 0),
      completedToday: metrics?.completedToday ?? 0,
      slaBreached: metrics?.slaBreached ?? 0,
      techniciansOnline: metrics?.techniciansOnline ?? 0,
      avgRating: metrics?.avgRating ?? null,
      dailyByStatus: dailyByStatus ?? [],
      pendingLast7Days: pendingLast7Days ?? [],
      recentlyCompleted: recentlyCompleted ?? [],
      technicianWorkload: technicianWorkload ?? [],
      recentActivities: recentActivities ?? [],
    };
  }

  private async getAggregatedMetrics(
    scopeId?: string | null,
    scopeField?: string,
  ) {
    if (scopeId && scopeField) {
      const isTechScope = scopeField === 'technicianId';
      const rows = await this.prisma.$queryRaw<
        {
          total_orders: bigint;
          pending_orders: bigint;
          in_process_orders: bigint;
          completed_today: bigint;
          sla_breached: bigint;
          techs_online: bigint;
          avg_rating: number | null;
        }[]
      >`
        SELECT
          (SELECT COUNT(*)::bigint FROM work_orders WHERE ${Prisma.raw(scopeField)} = ${scopeId}::uuid) AS total_orders,
          (SELECT COUNT(*)::bigint FROM work_orders WHERE ${Prisma.raw(scopeField)} = ${scopeId}::uuid AND status IN ('REQUESTED','ASSIGNED','ACCEPTED')) AS pending_orders,
          (SELECT COUNT(*)::bigint FROM work_orders WHERE ${Prisma.raw(scopeField)} = ${scopeId}::uuid AND status IN ('EN_ROUTE','IN_PROGRESS','ISSUE')) AS in_process_orders,
          (SELECT COUNT(*)::bigint FROM work_orders WHERE ${Prisma.raw(scopeField)} = ${scopeId}::uuid AND status = 'COMPLETED' AND completed_at::date = CURRENT_DATE) AS completed_today,
          (SELECT COUNT(*)::bigint FROM work_orders WHERE ${Prisma.raw(scopeField)} = ${scopeId}::uuid AND status NOT IN ('COMPLETED','CANCELLED') AND sla_deadline < NOW()) AS sla_breached,
          ${
            isTechScope
              ? Prisma.sql`(SELECT CASE WHEN EXISTS (SELECT 1 FROM technicians WHERE id = ${scopeId}::uuid AND status = 'AVAILABLE') THEN 1 ELSE 0 END)`
              : Prisma.sql`(SELECT COUNT(*)::bigint FROM technicians WHERE status = 'AVAILABLE')`
          } AS techs_online,
          ${
            isTechScope
              ? Prisma.sql`(SELECT AVG(score)::numeric(3,2) FROM ratings WHERE technician_id = ${scopeId}::uuid)`
              : Prisma.sql`(SELECT AVG(score)::numeric(3,2) FROM ratings)`
          } AS avg_rating
      `;
      return {
        totalOrders: Number(rows[0].total_orders),
        pendingOrders: Number(rows[0].pending_orders),
        inProcessOrders: Number(rows[0].in_process_orders),
        completedToday: Number(rows[0].completed_today),
        slaBreached: Number(rows[0].sla_breached),
        techniciansOnline: Number(rows[0].techs_online),
        avgRating: rows[0].avg_rating ? Number(rows[0].avg_rating) : null,
      };
    }

    const rows = await this.prisma.$queryRaw<
      {
        total_orders: bigint;
        pending_orders: bigint;
        in_process_orders: bigint;
        completed_today: bigint;
        sla_breached: bigint;
        techs_online: bigint;
        avg_rating: number | null;
      }[]
    >`
      SELECT
        (SELECT COUNT(*)::bigint FROM work_orders) AS total_orders,
        (SELECT COUNT(*)::bigint FROM work_orders WHERE status IN ('REQUESTED','ASSIGNED','ACCEPTED')) AS pending_orders,
        (SELECT COUNT(*)::bigint FROM work_orders WHERE status IN ('EN_ROUTE','IN_PROGRESS','ISSUE')) AS in_process_orders,
        (SELECT COUNT(*)::bigint FROM work_orders WHERE status = 'COMPLETED' AND completed_at::date = CURRENT_DATE) AS completed_today,
        (SELECT COUNT(*)::bigint FROM work_orders WHERE status NOT IN ('COMPLETED','CANCELLED') AND sla_deadline < NOW()) AS sla_breached,
        (SELECT COUNT(*)::bigint FROM technicians WHERE status = 'AVAILABLE') AS techs_online,
        (SELECT AVG(score)::numeric(3,2) FROM ratings) AS avg_rating
    `;
    return {
      totalOrders: Number(rows[0].total_orders),
      pendingOrders: Number(rows[0].pending_orders),
      inProcessOrders: Number(rows[0].in_process_orders),
      completedToday: Number(rows[0].completed_today),
      slaBreached: Number(rows[0].sla_breached),
      techniciansOnline: Number(rows[0].techs_online),
      avgRating: rows[0].avg_rating ? Number(rows[0].avg_rating) : null,
    };
  }

  private async getDailyByStatusRaw() {
    const rows = await this.prisma.$queryRaw<
      {
        status: string;
        count: bigint;
      }[]
    >`
      SELECT status::text, COUNT(*)::bigint AS count
      FROM work_orders
      WHERE created_at::date = CURRENT_DATE
      GROUP BY status
      ORDER BY count DESC
    `;
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  private async getPendingLast7Days(
    scopeId?: string | null,
    scopeField?: string,
  ) {
    return this.prisma.workOrder.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
        status: {
          notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
        },
        ...(scopeId && scopeField ? { [scopeField]: scopeId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true } },
        dealer: { select: { id: true, companyName: true } },
        technician: { select: { id: true, user: { select: { email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: DEFAULT_PAGE_LIMIT,
    });
  }

  private async getRecentlyCompleted(
    scopeId?: string | null,
    scopeField?: string,
  ) {
    return this.prisma.workOrder.findMany({
      where: {
        status: WorkOrderStatus.COMPLETED,
        ...(scopeId && scopeField ? { [scopeField]: scopeId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true } },
        dealer: { select: { id: true, companyName: true } },
        technician: { select: { id: true, user: { select: { email: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: DEFAULT_PAGE_LIMIT,
    });
  }

  private async getTechnicianWorkload() {
    const rows = await this.prisma.$queryRaw<
      {
        technician_id: string;
        email: string;
        assigned_count: bigint;
      }[]
    >`
      SELECT wo.technician_id, u.email, COUNT(*)::bigint AS assigned_count
      FROM work_orders wo
      JOIN technicians t ON t.id = wo.technician_id
      JOIN users u ON u.id = t.user_id
      WHERE wo.status NOT IN ('COMPLETED','CANCELLED')
        AND wo.technician_id IS NOT NULL
      GROUP BY wo.technician_id, u.email
      ORDER BY assigned_count DESC
    `;
    return rows.map((r) => ({
      technicianId: r.technician_id,
      email: r.email,
      assignedCount: Number(r.assigned_count),
    }));
  }

  private async getRecentActivities(
    scopeId?: string | null,
    scopeField?: string,
  ) {
    const whereClause =
      scopeId && scopeField
        ? scopeField === 'technicianId'
          ? Prisma.sql`WHERE wo.technician_id = ${scopeId}::uuid`
          : Prisma.sql`WHERE wo.dealer_id = ${scopeId}::uuid`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        work_order_id: string;
        from_status: string | null;
        to_status: string;
        changed_by: string | null;
        changed_at: Date;
      }[]
    >`
      SELECT
        h.id,
        h.work_order_id,
        h.from_status::text AS from_status,
        h.to_status::text AS to_status,
        u.email AS changed_by,
        h.changed_at
      FROM work_order_status_history h
      JOIN work_orders wo ON wo.id = h.work_order_id
      LEFT JOIN users u ON u.id = h.changed_by_user_id
      ${whereClause}
      ORDER BY h.changed_at DESC
      LIMIT 50
    `;
    return rows.map((r) => ({
      id: r.id,
      orderId: r.work_order_id,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      changedBy: r.changed_by,
      timestamp: r.changed_at,
    }));
  }

  async getSummary(query: SummaryQueryDto) {
    const periodInterval = this.buildPeriodInterval(query.period);
    const periodName = query.period ?? 'month';

    const rows = await this.prisma.$queryRaw<
      {
        date: Date;
        total: bigint;
        completed: bigint;
        cancelled: bigint;
      }[]
    >`
      SELECT
        created_at::date AS date,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::bigint AS completed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::bigint AS cancelled
      FROM work_orders
      WHERE created_at >= NOW() - ${periodInterval}::interval
      GROUP BY created_at::date
      ORDER BY date
    `;

    return {
      period: periodName,
      data: rows.map((r) => ({
        date: r.date.toISOString(),
        total: Number(r.total),
        completed: Number(r.completed),
        cancelled: Number(r.cancelled),
      })),
    };
  }

  async search(query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    const keyword = `%${query}%`;

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        status: string;
        dealer_name: string | null;
        technician_email: string | null;
        created_at: Date;
      }[]
    >`
      SELECT wo.id, wo.status::text, d.company_name AS dealer_name,
             u.email AS technician_email, wo.created_at
      FROM work_orders wo
      LEFT JOIN dealers d ON d.id = wo.dealer_id
      LEFT JOIN technicians t ON t.id = wo.technician_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE wo.id::text ILIKE ${keyword}
         OR d.company_name ILIKE ${keyword}
         OR u.email ILIKE ${keyword}
      ORDER BY wo.created_at DESC
      LIMIT 20
    `;

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      dealerName: r.dealer_name,
      technicianEmail: r.technician_email,
      createdAt: r.created_at,
    }));
  }

  private buildPeriodInterval(period?: string): string {
    switch (period) {
      case 'week':
        return '7 days';
      case 'month':
        return '30 days';
      case 'quarter':
        return '90 days';
      case 'year':
        return '365 days';
      default:
        return '30 days';
    }
  }
}
