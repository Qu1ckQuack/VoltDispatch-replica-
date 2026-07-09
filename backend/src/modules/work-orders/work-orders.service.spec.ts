jest.mock('../common/prisma.service.js', () => ({
  PrismaService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundAppException,
  ForbiddenAppException,
  BadRequestAppException,
} from '../common/errors/app-exception.js';
import { WorkOrdersService } from './work-orders.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { ScopingService } from '../common/services/scoping.service.js';
import { StateMachineService } from './services/state-machine.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RedisService } from '../redis/redis.service.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';

const mockPrismaWorkOrderFindFirst = jest.fn();
const mockPrismaWorkOrderFindMany = jest.fn();
const mockPrismaWorkOrderFindUnique = jest.fn();
const mockPrismaWorkOrderCreate = jest.fn();
const mockPrismaWorkOrderUpdate = jest.fn();
const mockPrismaStatusHistoryCreate = jest.fn();
const mockPrismaTransaction = jest.fn(
  (cb: (tx: Record<string, unknown>) => unknown) =>
    cb({
      workOrder: {
        findUnique: mockPrismaWorkOrderFindUnique,
        update: mockPrismaWorkOrderUpdate,
      },
      workOrderStatusHistory: { create: mockPrismaStatusHistoryCreate },
    }),
);
const mockApplyWorkOrderScope = jest.fn();
const mockStateMachineValidate = jest.fn();
const mockNotificationsEnqueue = jest.fn();
const mockRedisPublish = jest.fn();
const mockPrismaTechnicianFindUnique = jest.fn();
const mockPrismaCustomerFindUnique = jest.fn();

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    role: string;
    profileId: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'user-1',
    email: overrides.email ?? 'user@test.com',
    role: overrides.role ?? 'DEALER',
    profileId: overrides.profileId ?? null,
  };
}

function makeOrder(
  overrides: Partial<{
    id: string;
    status: WorkOrderStatus;
    customerId: string;
    technicianId: string | null;
    dealerId: string;
    deviceId: string;
    subDistrict: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? 'order-1',
    status: overrides.status ?? WorkOrderStatus.REQUESTED,
    customerId: overrides.customerId ?? 'cust-1',
    technicianId: overrides.technicianId ?? null,
    dealerId: overrides.dealerId ?? 'dealer-1',
    deviceId: overrides.deviceId ?? 'dev-1',
    subDistrict: overrides.subDistrict ?? 'district-1',
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    customer: { id: 'cust-1', name: 'Test Customer' },
    device: { id: 'dev-1', model: 'CP50' },
    technician: null,
    statusHistory: [],
  };
}

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;

  beforeEach(async () => {
    mockPrismaWorkOrderFindFirst.mockReset();
    mockPrismaWorkOrderFindMany.mockReset();
    mockPrismaWorkOrderFindUnique.mockReset();
    mockPrismaWorkOrderCreate.mockReset();
    mockPrismaWorkOrderUpdate.mockReset();
    mockPrismaStatusHistoryCreate.mockReset();
    mockPrismaTransaction.mockReset();
    mockApplyWorkOrderScope.mockReset();
    mockStateMachineValidate.mockReset();
    mockNotificationsEnqueue.mockReset();
    mockRedisPublish.mockReset();
    mockPrismaTechnicianFindUnique.mockReset();
    mockPrismaCustomerFindUnique.mockReset();

    mockPrismaTransaction.mockImplementation(
      (cb: (tx: Record<string, unknown>) => unknown) =>
        cb({
          workOrder: {
            findUnique: mockPrismaWorkOrderFindUnique,
            update: mockPrismaWorkOrderUpdate,
          },
          workOrderStatusHistory: { create: mockPrismaStatusHistoryCreate },
        }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        {
          provide: PrismaService,
          useValue: {
            workOrder: {
              findFirst: mockPrismaWorkOrderFindFirst,
              findMany: mockPrismaWorkOrderFindMany,
              create: mockPrismaWorkOrderCreate,
              findUnique: mockPrismaWorkOrderFindUnique,
            },
            workOrderStatusHistory: { create: mockPrismaStatusHistoryCreate },
            technician: { findUnique: mockPrismaTechnicianFindUnique },
            customer: { findUnique: mockPrismaCustomerFindUnique },
            $transaction: mockPrismaTransaction,
          },
        },
        {
          provide: ScopingService,
          useValue: { applyWorkOrderScope: mockApplyWorkOrderScope },
        },
        {
          provide: StateMachineService,
          useValue: {
            validate: mockStateMachineValidate,
          },
        },
        {
          provide: NotificationsService,
          useValue: { enqueue: mockNotificationsEnqueue },
        },
        {
          provide: RedisService,
          useValue: { publish: mockRedisPublish },
        },
      ],
    }).compile();

    service = module.get<WorkOrdersService>(WorkOrdersService);
  });

  describe('findById', () => {
    it('returns work order when scoped access succeeds', async () => {
      const order = makeOrder();
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);

      const result = await service.findById(
        'order-1',
        makeUser({ role: 'DEALER', profileId: 'dealer-1' }),
      );
      expect(result).toEqual(order);
      expect(mockPrismaWorkOrderFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1' } }),
      );
    });

    it('throws NotFoundException when work order not in scope', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({ dealerId: 'other-dealer' });
      mockPrismaWorkOrderFindFirst.mockResolvedValue(null);

      await expect(
        service.findById(
          'order-1',
          makeUser({ role: 'DEALER', profileId: 'dealer-1' }),
        ),
      ).rejects.toThrow(NotFoundAppException);
    });
  });

  describe('state machine transitions', () => {
    it('allows valid transition REQUESTED → ASSIGNED', async () => {
      const order = makeOrder({ status: WorkOrderStatus.REQUESTED });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.ASSIGNED,
        technicianId: 'tech-1',
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      const result = await service.assign(
        'order-1',
        { technicianId: 'tech-1' },
        makeUser({ role: 'COORDINATOR' }),
      );
      expect(result.status).toBe(WorkOrderStatus.ASSIGNED);
      expect(mockStateMachineValidate).toHaveBeenCalledWith(
        WorkOrderStatus.REQUESTED,
        WorkOrderStatus.ASSIGNED,
      );
    });

    it('rejects invalid transition REQUESTED → EN_ROUTE', async () => {
      const order = makeOrder({ status: WorkOrderStatus.REQUESTED });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockImplementation(() => {
        throw new BadRequestAppException(
          'Cannot transition from REQUESTED to EN_ROUTE',
        );
      });

      await expect(
        service.startTravel(
          'order-1',
          makeUser({ role: 'TECHNICIAN', profileId: 'tech-1' }),
        ),
      ).rejects.toThrow(BadRequestAppException);
    });

    it('sets completedAt on COMPLETED transition', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.IN_PROGRESS,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      const completedOrder = {
        ...order,
        status: WorkOrderStatus.COMPLETED,
        completedAt: new Date(),
      };
      mockPrismaWorkOrderUpdate.mockResolvedValue(completedOrder);
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);
      mockPrismaTechnicianFindUnique.mockResolvedValue({
        userId: 'tech-user-1',
      });

      const result = await service.complete(
        'order-1',
        makeUser({ role: 'TECHNICIAN', profileId: 'tech-1' }),
      );
      expect(result.status).toBe(WorkOrderStatus.COMPLETED);
      expect(mockPrismaWorkOrderUpdate).toHaveBeenCalledWith(
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        expect.objectContaining({
          data: expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      );
      expect(result).toHaveProperty('completedAt');
    });

    it('publishes activity event to Redis on transition', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.EN_ROUTE,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.IN_PROGRESS,
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      await service.startWork(
        'order-1',
        makeUser({
          role: 'TECHNICIAN',
          profileId: 'tech-1',
          email: 'tech@test.com',
        }),
      );

      expect(mockRedisPublish).toHaveBeenCalledWith(
        'hq:activities',
        expect.stringContaining('status_change'),
      );
      const [, callData] = mockRedisPublish.mock.calls[0] as [string, string];
      const published = JSON.parse(callData) as {
        type: string;
        orderId: string;
        fromStatus: WorkOrderStatus;
        toStatus: WorkOrderStatus;
      };
      expect(published.type).toBe('status_change');
      expect(published.orderId).toBe('order-1');
      expect(published.fromStatus).toBe(WorkOrderStatus.EN_ROUTE);
      expect(published.toStatus).toBe(WorkOrderStatus.IN_PROGRESS);
    });

    it('handles optimistic concurrency conflict', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ACCEPTED,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.EN_ROUTE,
      });

      await expect(
        service.accept(
          'order-1',
          makeUser({ role: 'TECHNICIAN', profileId: 'tech-1' }),
        ),
      ).rejects.toThrow('Work order was modified by another request');
    });
  });

  describe('cancel permission rules', () => {
    it('allows DEALER to cancel REQUESTED order', async () => {
      const order = makeOrder({ status: WorkOrderStatus.REQUESTED });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.CANCELLED,
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      const result = await service.cancel(
        'order-1',
        makeUser({ role: 'DEALER', profileId: 'dealer-1' }),
      );
      expect(result.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('allows HQ to cancel REQUESTED order', async () => {
      const order = makeOrder({ status: WorkOrderStatus.REQUESTED });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.CANCELLED,
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      const result = await service.cancel('order-1', makeUser({ role: 'HQ' }));
      expect(result.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('allows DEALER to cancel ASSIGNED order', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ASSIGNED,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.CANCELLED,
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      await expect(
        service.cancel(
          'order-1',
          makeUser({ role: 'DEALER', profileId: 'dealer-1' }),
        ),
      ).resolves.toHaveProperty('status', WorkOrderStatus.CANCELLED);
    });

    it('allows TECHNICIAN to cancel ASSIGNED order (own)', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ASSIGNED,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.CANCELLED,
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      await expect(
        service.cancel(
          'order-1',
          makeUser({ role: 'TECHNICIAN', profileId: 'tech-1' }),
        ),
      ).resolves.toHaveProperty('status', WorkOrderStatus.CANCELLED);
    });

    it('forbids DEALER to cancel ACCEPTED order', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ACCEPTED,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);

      await expect(
        service.cancel(
          'order-1',
          makeUser({ role: 'DEALER', profileId: 'dealer-1' }),
        ),
      ).rejects.toThrow(ForbiddenAppException);
    });

    it('allows TECHNICIAN to cancel ACCEPTED order (own)', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ACCEPTED,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.CANCELLED,
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      await expect(
        service.cancel(
          'order-1',
          makeUser({ role: 'TECHNICIAN', profileId: 'tech-1' }),
        ),
      ).resolves.toHaveProperty('status', WorkOrderStatus.CANCELLED);
    });

    it('allows CUSTOMER to cancel ACCEPTED order (own)', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ACCEPTED,
        customerId: 'cust-1',
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);
      mockStateMachineValidate.mockReturnValue(undefined);
      mockPrismaWorkOrderFindUnique.mockResolvedValue(order);
      mockPrismaWorkOrderUpdate.mockResolvedValue({
        ...order,
        status: WorkOrderStatus.CANCELLED,
      });
      mockPrismaStatusHistoryCreate.mockResolvedValue({});
      mockRedisPublish.mockResolvedValue(undefined);

      await expect(
        service.cancel('order-1', makeUser({ role: 'CUSTOMER', id: 'cust-1' })),
      ).resolves.toHaveProperty('status', WorkOrderStatus.CANCELLED);
    });

    it("forbids CUSTOMER to cancel another customer's order", async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ACCEPTED,
        customerId: 'cust-1',
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);

      await expect(
        service.cancel('order-1', makeUser({ role: 'CUSTOMER', id: 'cust-2' })),
      ).rejects.toThrow(ForbiddenAppException);
    });

    it('forbids TECHNICIAN to cancel another technician assigned order', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ASSIGNED,
        technicianId: 'tech-2',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);

      await expect(
        service.cancel(
          'order-1',
          makeUser({ role: 'TECHNICIAN', profileId: 'tech-1' }),
        ),
      ).rejects.toThrow(ForbiddenAppException);
    });

    it('forbids HQ to cancel ACCEPTED order', async () => {
      const order = makeOrder({
        status: WorkOrderStatus.ACCEPTED,
        technicianId: 'tech-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue(order);

      await expect(
        service.cancel('order-1', makeUser({ role: 'HQ' })),
      ).rejects.toThrow(ForbiddenAppException);
    });
  });
});
