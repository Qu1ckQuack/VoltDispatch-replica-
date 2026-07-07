import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';
import type { SummaryQueryDto } from './dto/summery-query.dto.js';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      stats,
      dailyByStatus,
      pendingLast7Days,
      recentlyCompleted,
      technicianWorkload,
      recentActivities,
    ] = await Promise.all([
      this.getStats(),
      this.getDailyByStatusRaw(),
      this.getPendingLast7Days(),
      this.getRecentlyCompleted(),
      this.getTechnicianWorkload(),
      this.getRecentActivities(),
    ]);

    return {
      stats,
      dailyByStatus,
      pendingLast7Days,
      recentlyCompleted,
      technicianWorkload,
      recentActivities,
    };
  }

  private async getStats() {
    const rows = await this.prisma.$queryRaw<
      {
        total_orders: bigint;
        pending_orders: bigint;
        in_process_orders: bigint;
        completed_orders: bigint;
      }[]
    >`
      SELECT
        (SELECT COUNT(*)::bigint FROM work_orders) AS total_orders,
        (SELECT COUNT(*)::bigint FROM work_orders WHERE status IN ('REQUESTED','ASSIGNED','ACCEPTED')) AS pending_orders,
        (SELECT COUNT(*)::bigint FROM work_orders WHERE status IN ('EN_ROUTE','IN_PROGRESS','ISSUE')) AS in_process_orders,
        (SELECT COUNT(*)::bigint FROM work_orders WHERE status = 'COMPLETED') AS completed_orders
    `;
    return {
      totalOrders: Number(rows[0].total_orders),
      pendingOrders: Number(rows[0].pending_orders),
      inProcessOrders: Number(rows[0].in_process_orders),
      completedOrders: Number(rows[0].completed_orders),
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

  private async getPendingLast7Days() {
    return this.prisma.workOrder.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: {
          notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        dealer: { select: { id: true, companyName: true } },
        technician: { select: { id: true, user: { select: { email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async getRecentlyCompleted() {
    return this.prisma.workOrder.findMany({
      where: { status: WorkOrderStatus.COMPLETED },
      include: {
        customer: { select: { id: true, name: true } },
        dealer: { select: { id: true, companyName: true } },
        technician: { select: { id: true, user: { select: { email: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  private async getTechnicianWorkload() {
    const rows = await this.prisma.$queryRaw<
      {
        technician_id: string;
        name: string;
        assigned_count: bigint;
      }[]
    >`
      SELECT wo.technician_id, u.name, COUNT(*)::bigint AS assigned_count
      FROM work_orders wo
      JOIN technicians t ON t.id = wo.technician_id
      JOIN users u ON u.id = t.user_id
      WHERE wo.status NOT IN ('COMPLETED','CANCELLED')
        AND wo.technician_id IS NOT NULL
      GROUP BY wo.technician_id, u.name
      ORDER BY assigned_count DESC
    `;
    return rows.map((r) => ({
      technicianId: r.technician_id,
      name: r.name,
      assignedCount: Number(r.assigned_count),
    }));
  }

  private async getRecentActivities() {
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
      LEFT JOIN users u ON u.id = h.changed_by_user_id
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

    const rows = await this.prisma.$queryRaw<
      {
        total_completed: bigint;
        avg_processing_hours: number | null;
        on_time_rate: number | null;
        avg_rating: number | null;
        growth_trend: { month: string; completed_count: bigint }[] | null;
        top_dealers:
          | { dealer_id: string; company_name: string; order_count: bigint }[]
          | null;
        popular_chargers: { model: string; count: bigint }[] | null;
        dealer_summary:
          | {
              dealer_name: string;
              total_orders: bigint;
              completed: bigint;
              issues: bigint;
              avg_time: number | null;
              avg_rating: number | null;
              sla_percent: number | null;
            }[]
          | null;
      }[]
    >`
      WITH filtered AS (
        SELECT * FROM work_orders
        WHERE completed_at IS NOT NULL
          AND completed_at >= NOW() - ${periodInterval}::interval
      )
      SELECT
        (SELECT COUNT(*)::bigint FROM filtered) AS total_completed,
        (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) FROM filtered) AS avg_processing_hours,
        (SELECT
          CASE WHEN COUNT(*) > 0
            THEN ROUND((COUNT(*) FILTER (WHERE completed_at <= sla_deadline OR sla_deadline IS NULL))::numeric /
                       COUNT(*)::numeric, 4)
            ELSE 0 END
         FROM filtered) AS on_time_rate,
        (SELECT AVG(r.score)::numeric(3,2) FROM filtered f JOIN ratings r ON r.work_order_id = f.id) AS avg_rating,
        (SELECT COALESCE(json_agg(row), '[]'::json) FROM (
          SELECT
            TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') AS month,
            COUNT(*)::bigint AS completed_count
          FROM filtered
          GROUP BY DATE_TRUNC('month', completed_at)
          ORDER BY 1
        ) row) AS growth_trend,
        (SELECT COALESCE(json_agg(row), '[]'::json) FROM (
          SELECT d.id AS dealer_id, d.company_name, COUNT(*)::bigint AS order_count
          FROM filtered f
          JOIN dealers d ON d.id = f.dealer_id
          GROUP BY d.id, d.company_name
          ORDER BY order_count DESC
          LIMIT 10
        ) row) AS top_dealers,
        (SELECT COALESCE(json_agg(row), '[]'::json) FROM (
          SELECT dv.model, COUNT(*)::bigint AS count
          FROM filtered f
          JOIN devices dv ON dv.id = f.device_id
          GROUP BY dv.model
          ORDER BY count DESC
          LIMIT 10
        ) row) AS popular_chargers,
        (SELECT COALESCE(json_agg(row), '[]'::json) FROM (
          SELECT
            d.company_name AS dealer_name,
            COUNT(*)::bigint AS total_orders,
            COUNT(*) FILTER (WHERE f.status = 'COMPLETED')::bigint AS completed,
            COUNT(*) FILTER (WHERE f.status IN ('ISSUE','ESCALATED'))::bigint AS issues,
            ROUND(AVG(EXTRACT(EPOCH FROM (f.completed_at - f.created_at)) / 3600) FILTER (WHERE f.status = 'COMPLETED'), 2) AS avg_time,
            ROUND(AVG(r.score) FILTER (WHERE f.status = 'COMPLETED'), 2) AS avg_rating,
            CASE WHEN COUNT(*) FILTER (WHERE f.status = 'COMPLETED') > 0
              THEN ROUND(
                (COUNT(*) FILTER (WHERE f.status = 'COMPLETED' AND f.completed_at <= f.sla_deadline))::numeric /
                (COUNT(*) FILTER (WHERE f.status = 'COMPLETED'))::numeric, 4)
              ELSE 0 END AS sla_percent
          FROM filtered f
          JOIN dealers d ON d.id = f.dealer_id
          LEFT JOIN ratings r ON r.work_order_id = f.id
          GROUP BY d.id, d.company_name
          ORDER BY total_orders DESC
        ) row) AS dealer_summary
    `;

    const row = rows[0];
    return {
      metrics: {
        totalCompleted: Number(row.total_completed),
        avgProcessingHours: row.avg_processing_hours
          ? Number(row.avg_processing_hours.toFixed(2))
          : 0,
        onTimeRate: row.on_time_rate ? Number(row.on_time_rate) : 0,
        avgRatingScore: row.avg_rating ? Number(row.avg_rating) : 0,
      },
      growthTrend: (row.growth_trend ?? []).map((g) => ({
        month: g.month,
        completedCount: Number(g.completed_count),
      })),
      topDealers: (row.top_dealers ?? []).map((d) => ({
        dealerId: d.dealer_id,
        companyName: d.company_name,
        orderCount: Number(d.order_count),
      })),
      popularChargers: (row.popular_chargers ?? []).map((c) => ({
        model: c.model,
        count: Number(c.count),
      })),
      dealerSummary: (row.dealer_summary ?? []).map((s) => ({
        dealerName: s.dealer_name,
        totalOrders: Number(s.total_orders),
        completed: Number(s.completed),
        issues: Number(s.issues),
        avgTime: s.avg_time ? Number(s.avg_time) : 0,
        avgRating: s.avg_rating ? Number(s.avg_rating) : 0,
        slaPercent: s.sla_percent ? Number(s.sla_percent) : 0,
      })),
    };
  }

  async search(query: string) {
    const keyword = `%${query}%`;

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        status: string;
        dealer_name: string | null;
        technician_name: string | null;
        created_at: Date;
      }[]
    >`
      SELECT wo.id, wo.status::text, d.company_name AS dealer_name,
             u.name AS technician_name, wo.created_at
      FROM work_orders wo
      LEFT JOIN dealers d ON d.id = wo.dealer_id
      LEFT JOIN technicians t ON t.id = wo.technician_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE wo.id::text ILIKE ${keyword}
         OR d.company_name ILIKE ${keyword}
         OR u.name ILIKE ${keyword}
      ORDER BY wo.created_at DESC
      LIMIT 20
    `;

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      dealerName: r.dealer_name,
      technicianName: r.technician_name,
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
