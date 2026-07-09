import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { ProfileBaseService } from '../common/services/profile-base.service.js';
import { UsersService } from '../users/users.service.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { CreateTechnicianDto } from './dto/create-technician.dto.js';
import { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';

@Injectable()
export class TechniciansService extends ProfileBaseService {
  constructor(prisma: PrismaService, usersService: UsersService) {
    super(prisma, usersService);
  }

  protected get modelName(): string {
    return 'technician';
  }

  protected get displayName(): string {
    return 'Technician';
  }

  async findByUserId(userId: string) {
    return super.findByUserId(userId) as Promise<{
      id: string;
      userId: string;
    }>;
  }

  async create(dto: CreateTechnicianDto) {
    await this.profileExists(dto.userId);
    return this.prisma.technician.create({
      data: dto,
      include: { user: true },
    });
  }

  async findAll() {
    return this.prisma.technician.findMany({
      include: { user: true, _count: { select: { workOrders: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.getProfileById(id);
  }

  async update(id: string, dto: UpdateTechnicianDto) {
    await this.getProfileById(id);
    return this.prisma.technician.update({
      where: { id },
      data: dto,
      include: { user: true },
    });
  }

  async findForMap(currentUser: AuthenticatedUser) {
    const isTechnician = currentUser.role === 'TECHNICIAN';

    if (isTechnician && !currentUser.profileId) {
      return [];
    }

    const where = isTechnician ? { id: currentUser.profileId! } : {};

    return this.prisma.technician.findMany({
      where,
      select: {
        id: true,
        userId: true,
        status: true,
        lastLat: true,
        lastLng: true,
        district: true,
        subDistrict: true,
        user: { select: { email: true } },
      },
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    return this.prisma.technician.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
