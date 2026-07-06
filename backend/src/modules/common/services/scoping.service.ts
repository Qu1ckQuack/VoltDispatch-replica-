import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { UserRole } from '../../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  phone?: string | null;
  profileId?: string | null;
}

export interface CustomerUser {
  id: string;
  name: string;
  email?: string | null;
  type: 'customer';
}

export type CurrentUser = AuthenticatedUser | CustomerUser;

@Injectable()
export class ScopingService {
  private readonly logger = new Logger(ScopingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyWorkOrderScope(
    user: CurrentUser | undefined,
  ): Promise<Record<string, unknown>> {
    if (!user || 'type' in user) {
      return {};
    }

    switch (user.role) {
      case UserRole.HQ:
        return {};
      case UserRole.DEALER: {
        if (user.profileId) return { dealerId: user.profileId };
        const dealer = await this.prisma.dealer.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        return dealer ? { dealerId: dealer.id } : { dealerId: 'none' };
      }
      case UserRole.COORDINATOR: {
        if (!user.profileId) return {};
        const coordinator = await this.prisma.coordinator.findUnique({
          where: { id: user.profileId },
          select: { department: true },
        });
        if (!coordinator) return {};
        return { department: coordinator.department };
      }
      case UserRole.TECHNICIAN: {
        if (user.profileId) return { technicianId: user.profileId };
        const tech = await this.prisma.technician.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        return tech ? { technicianId: tech.id } : { technicianId: 'none' };
      }
      default:
        this.logger.warn(`Unknown role for scoping: ${user.role}`);
        return {};
    }
  }

  applyCustomerOrderScope(customerId: string): Record<string, unknown> {
    return { customerId };
  }
}
