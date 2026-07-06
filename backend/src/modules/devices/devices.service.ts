import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertDeviceAccess(id: string, user: AuthenticatedUser): Promise<void> {
    if (user.role === UserRole.HQ) return;
    const device = await this.prisma.device.findUnique({ where: { id }, select: { dealerId: true } });
    if (!device) throw new NotFoundException('Device not found');
    if (device.dealerId !== user.profileId) {
      throw new ForbiddenException('Access denied');
    }
  }

  async create(dto: CreateDeviceDto, dealerId: string) {
    const existing = await this.prisma.device.findUnique({ where: { serialNumber: dto.serialNumber } });
    if (existing) throw new ConflictException('Serial number already registered');

    return this.prisma.device.create({
      data: {
        dealerId,
        model: dto.model,
        serialNumber: dto.serialNumber,
        ipAddress: dto.ipAddress,
        metadata: dto.metadata as object,
      },
      include: { dealer: true },
    });
  }

  async findAll(dealerId?: string) {
    const where = dealerId ? { dealerId } : {};
    return this.prisma.device.findMany({
      where,
      include: { dealer: true, _count: { select: { workOrders: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, user?: AuthenticatedUser) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { dealer: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (user) await this.assertDeviceAccess(id, user);
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto, user?: AuthenticatedUser) {
    if (user) await this.assertDeviceAccess(id, user);
    const data: Record<string, unknown> = {};
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
    if (dto.ipAddress !== undefined) data.ipAddress = dto.ipAddress;
    if (dto.metadata !== undefined) data.metadata = dto.metadata as object;

    return this.prisma.device.update({ where: { id }, data });
  }

  async remove(id: string, user?: AuthenticatedUser) {
    if (user) await this.assertDeviceAccess(id, user);
    await this.prisma.device.delete({ where: { id } });
    return { deleted: true };
  }
}
