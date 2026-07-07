import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { ProfileBaseService } from '../common/services/profile-base.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateCoordinatorDto } from './dto/create-coordinator.dto.js';
import { UpdateCoordinatorDto } from './dto/update-coordinator.dto.js';

@Injectable()
export class CoordinatorsService extends ProfileBaseService {
  constructor(prisma: PrismaService, usersService: UsersService) {
    super(prisma, usersService);
  }

  protected get modelName(): string {
    return 'coordinator';
  }

  protected get displayName(): string {
    return 'Coordinator';
  }

  async findByUserId(userId: string) {
    return super.findByUserId(userId) as Promise<{ id: string; userId: string; department: string }>;
  }

  async create(dto: CreateCoordinatorDto) {
    await this.profileExists(dto.userId);
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
    return this.getProfileById(id);
  }

  async update(id: string, dto: UpdateCoordinatorDto) {
    await this.getProfileById(id);
    return this.prisma.coordinator.update({
      where: { id },
      data: dto,
      include: { user: true },
    });
  }
}
