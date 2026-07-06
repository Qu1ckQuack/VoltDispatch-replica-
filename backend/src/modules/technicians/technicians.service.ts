import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateTechnicianDto } from './dto/create-technician.dto.js';
import { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const technician = await this.prisma.technician.findUnique({ where: { userId } });
    if (!technician) throw new NotFoundException('Technician profile not found');
    return technician;
  }

  async create(dto: CreateTechnicianDto) {
    const existing = await this.prisma.technician.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('User already has a technician profile');

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
    const technician = await this.prisma.technician.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!technician) throw new NotFoundException('Technician not found');
    return technician;
  }

  async update(id: string, dto: UpdateTechnicianDto) {
    await this.findById(id);
    return this.prisma.technician.update({
      where: { id },
      data: dto,
      include: { user: true },
    });
  }

  async remove(id: string) {
    const technician = await this.findById(id);
    await this.prisma.user.update({
      where: { id: technician.userId },
      data: { isActive: false },
    });
    return { deleted: true };
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    return this.prisma.technician.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
