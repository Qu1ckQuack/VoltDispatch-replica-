import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { ProfileBaseService } from '../common/services/profile-base.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateDealerDto } from './dto/create-dealer.dto.js';
import { UpdateDealerDto } from './dto/update-dealer.dto.js';

@Injectable()
export class DealersService extends ProfileBaseService {
  constructor(prisma: PrismaService, usersService: UsersService) {
    super(prisma, usersService);
  }

  protected get modelName(): string {
    return 'dealer';
  }

  protected get displayName(): string {
    return 'Dealer';
  }

  async findByUserId(userId: string) {
    return super.findByUserId(userId) as Promise<{
      id: string;
      userId: string;
      companyName: string;
    }>;
  }

  async create(dto: CreateDealerDto) {
    await this.profileExists(dto.userId);
    return this.prisma.dealer.create({
      data: {
        userId: dto.userId,
        companyName: dto.companyName,
        contactInfo: dto.contactInfo as object,
      },
      include: { user: true },
    });
  }

  async findAll() {
    return this.prisma.dealer.findMany({
      include: {
        user: true,
        _count: { select: { devices: true, workOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.getProfileById(id, { devices: true });
  }

  async update(id: string, dto: UpdateDealerDto) {
    await this.getProfileById(id);
    const data: Record<string, unknown> = {};
    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.contactInfo !== undefined) data.contactInfo = dto.contactInfo;
    return this.prisma.dealer.update({
      where: { id },
      data,
      include: { user: true },
    });
  }
}
