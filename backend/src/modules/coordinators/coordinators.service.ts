import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateCoordinatorDto } from './dto/create-coordinator.dto.js';
import { UpdateCoordinatorDto } from './dto/update-coordinator.dto.js';

@Injectable()
export class CoordinatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const coordinator = await this.prisma.coordinator.findUnique({ where: { userId } });
    if (!coordinator) throw new NotFoundException('Coordinator profile not found');
    return coordinator;
  }

  async create(dto: CreateCoordinatorDto) {
    const existing = await this.prisma.coordinator.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('User already has a coordinator profile');

    return this.prisma.coordinator.create({
      data: dto,
      include: { user: true },
    });
  }

  async findAll() {
    return this.prisma.coordinator.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const coordinator = await this.prisma.coordinator.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!coordinator) throw new NotFoundException('Coordinator not found');
    return coordinator;
  }

  async update(id: string, dto: UpdateCoordinatorDto) {
    await this.findById(id);
    return this.prisma.coordinator.update({
      where: { id },
      data: dto,
      include: { user: true },
    });
  }

  async remove(id: string) {
    const coordinator = await this.findById(id);
    await this.prisma.user.update({
      where: { id: coordinator.userId },
      data: { isActive: false },
    });
    return { deleted: true };
  }
}
