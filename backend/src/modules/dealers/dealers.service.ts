import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateDealerDto } from './dto/create-dealer.dto.js';
import { UpdateDealerDto } from './dto/update-dealer.dto.js';

@Injectable()
export class DealersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId } });
    if (!dealer) throw new NotFoundException('Dealer profile not found');
    return dealer;
  }

  async create(dto: CreateDealerDto) {
    const existing = await this.prisma.dealer.findUnique({
      where: { userId: dto.userId },
    });
    if (existing)
      throw new ConflictException('User already has a dealer profile');

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
    const dealer = await this.prisma.dealer.findUnique({
      where: { id },
      include: { user: true, devices: true },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');
    return dealer;
  }

  async update(id: string, dto: UpdateDealerDto) {
    await this.findById(id);
    const data: Record<string, unknown> = {};
    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.contactInfo !== undefined) data.contactInfo = dto.contactInfo;

    return this.prisma.dealer.update({
      where: { id },
      data,
      include: { user: true },
    });
  }

  async remove(id: string) {
    const dealer = await this.findById(id);
    await this.prisma.user.update({
      where: { id: dealer.userId },
      data: { isActive: false },
    });
    return { deleted: true };
  }
}
