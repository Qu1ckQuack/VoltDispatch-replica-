import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { rlsStorage, buildRlsStatements } from './services/rls-context.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly raw: PrismaClient;

  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });
    this.raw = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.raw.$connect();
  }

  async onModuleDestroy() {
    await this.raw.$disconnect();
  }

  get user() {
    return this.proxyModel(this.raw.user, 'user');
  }

  get dealer() {
    return this.proxyModel(this.raw.dealer, 'dealer');
  }

  get coordinator() {
    return this.proxyModel(this.raw.coordinator, 'coordinator');
  }

  get technician() {
    return this.proxyModel(this.raw.technician, 'technician');
  }

  get customer() {
    return this.proxyModel(this.raw.customer, 'customer');
  }

  get device() {
    return this.proxyModel(this.raw.device, 'device');
  }

  get workOrder() {
    return this.proxyModel(this.raw.workOrder, 'workOrder');
  }

  get workOrderStatusHistory() {
    return this.proxyModel(
      this.raw.workOrderStatusHistory,
      'workOrderStatusHistory',
    );
  }

  get workOrderImage() {
    return this.proxyModel(this.raw.workOrderImage, 'workOrderImage');
  }

  get rating() {
    return this.proxyModel(this.raw.rating, 'rating');
  }

  get notification() {
    return this.proxyModel(this.raw.notification, 'notification');
  }

  get registrationRequest() {
    return this.proxyModel(this.raw.registrationRequest, 'registrationRequest');
  }

  async $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.raw.$transaction(async (tx: PrismaClient) => {
      const ctx = rlsStorage.getStore();
      if (ctx) {
        for (const stmt of buildRlsStatements(ctx)) {
          await (
            tx as unknown as {
              $executeRawUnsafe: (s: string) => Promise<number>;
            }
          ).$executeRawUnsafe(stmt);
        }
      }
      return fn(tx);
    });
  }

  private proxyModel<T>(model: T, modelName: string): T {
    return new Proxy(model, {
      get: (target: T, prop: string | symbol) => {
        const value = (target as Record<string | symbol, unknown>)[prop];
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          const ctx = rlsStorage.getStore();
          if (!ctx) {
            return (value as (...args: unknown[]) => unknown).apply(
              target,
              args,
            );
          }
          return this.raw.$transaction(async (tx: PrismaClient) => {
            for (const stmt of buildRlsStatements(ctx)) {
              await tx.$executeRawUnsafe(stmt);
            }
            const txModel = (tx as unknown as Record<string, unknown>)[
              modelName
            ];
            const txMethod = (txModel as Record<string, unknown>)[
              prop as string
            ] as (...args: unknown[]) => unknown;
            return txMethod.apply(txModel, args);
          });
        };
      },
    }) as unknown as T;
  }

  $queryRaw<T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T> {
    return this.raw.$queryRaw(strings, ...values);
  }

  $queryRawUnsafe<T = unknown>(
    query: string,
    ...values: unknown[]
  ): Promise<T> {
    return this.raw.$queryRawUnsafe(query, ...values);
  }

  $executeRaw(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<number> {
    return this.raw.$executeRaw(strings, ...values);
  }

  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> {
    return this.raw.$executeRawUnsafe(query, ...values);
  }
}
