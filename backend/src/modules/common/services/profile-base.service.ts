import type { PrismaService } from '../prisma.service.js';
import type { UsersService } from '../../users/users.service.js';
import {
  NotFoundAppException,
  ConflictAppException,
} from '../errors/app-exception.js';

type PrismaDelegate = {
  findUnique: (
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null>;
  findMany: (
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

type PrismaClientWithDelegates = Record<string, PrismaDelegate>;

export abstract class ProfileBaseService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly usersService: UsersService,
  ) {}

  protected abstract get modelName(): string;
  protected abstract get displayName(): string;

  private get delegate(): PrismaDelegate {
    return (this.prisma as unknown as PrismaClientWithDelegates)[
      this.modelName
    ];
  }

  async findByUserId(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.delegate.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundAppException(`${this.displayName} profile`);
    return profile;
  }

  protected async profileExists(userId: string): Promise<void> {
    const existing = await this.delegate.findUnique({ where: { userId } });
    if (existing)
      throw new ConflictAppException(
        `User already has a ${this.displayName.toLowerCase()} profile`,
      );
  }

  protected async getProfileById(
    id: string,
    extraInclude?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const include = { user: true, ...extraInclude };
    const profile = await this.delegate.findUnique({
      where: { id },
      include,
    });
    if (!profile) throw new NotFoundAppException(`${this.displayName}`);
    return profile;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const profile = await this.getProfileById(id);
    await this.usersService.deactivate(profile.userId as string);
    return { deleted: true };
  }
}
