jest.mock('../common/prisma.service.js', () => ({
  PrismaService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RatingsService } from './ratings.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { ScopingService } from '../common/services/scoping.service.js';

const mockPrismaWorkOrderFindUnique = jest.fn();
const mockPrismaWorkOrderFindFirst = jest.fn();
const mockPrismaRatingCreate = jest.fn();
const mockPrismaRatingFindUnique = jest.fn();
const mockPrismaRatingAggregate = jest.fn();
const mockPrismaRatingCount = jest.fn();
const mockPrismaRatingDelete = jest.fn();
const mockPrismaTechnicianUpdate = jest.fn();
const mockPrismaTransaction = jest.fn();
const mockApplyWorkOrderScope = jest.fn();

describe('RatingsService', () => {
  let service: RatingsService;

  beforeEach(async () => {
    mockPrismaWorkOrderFindUnique.mockReset();
    mockPrismaWorkOrderFindFirst.mockReset();
    mockPrismaRatingCreate.mockReset();
    mockPrismaRatingFindUnique.mockReset();
    mockPrismaRatingAggregate.mockReset();
    mockPrismaRatingCount.mockReset();
    mockPrismaRatingDelete.mockReset();
    mockPrismaTechnicianUpdate.mockReset();
    mockPrismaTransaction.mockReset();
    mockApplyWorkOrderScope.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: PrismaService,
          useValue: {
            workOrder: {
              findUnique: mockPrismaWorkOrderFindUnique,
              findFirst: mockPrismaWorkOrderFindFirst,
            },
            rating: {
              create: mockPrismaRatingCreate,
              findUnique: mockPrismaRatingFindUnique,
              aggregate: mockPrismaRatingAggregate,
              count: mockPrismaRatingCount,
              delete: mockPrismaRatingDelete,
            },
            technician: {
              update: mockPrismaTechnicianUpdate,
            },
            $transaction: mockPrismaTransaction,
          },
        },
        {
          provide: ScopingService,
          useValue: { applyWorkOrderScope: mockApplyWorkOrderScope },
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
  });

  const dto = { score: 4, comment: 'Great service' };

  const mockCustomer = {
    id: 'cust-1',
    role: 'CUSTOMER',
    email: 'cust@test.com',
  };

  describe('create', () => {
    it('should create a rating and update technician stats in a transaction', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        customerId: 'cust-1',
        technicianId: 'tech-1',
        status: 'COMPLETED',
      });

      mockPrismaTransaction.mockImplementation(async (fn: Function) =>
        fn({
          rating: {
            create: mockPrismaRatingCreate,
            aggregate: mockPrismaRatingAggregate,
            count: mockPrismaRatingCount,
          },
          technician: {
            update: mockPrismaTechnicianUpdate,
          },
        }),
      );

      mockPrismaRatingCreate.mockResolvedValue({
        id: 'rating-1',
        workOrderId: 'wo-1',
        customerId: 'cust-1',
        technicianId: 'tech-1',
        score: 4,
        comment: 'Great service',
      });

      mockPrismaRatingCount.mockResolvedValue(5);
      mockPrismaRatingAggregate.mockResolvedValue({
        _avg: { score: 4.5 },
      });

      mockPrismaTechnicianUpdate.mockResolvedValue({ id: 'tech-1' });

      const result = await service.create('wo-1', dto, mockCustomer);

      expect(mockPrismaTransaction).toHaveBeenCalled();
      expect(result.score).toBe(4);
    });

    it('should throw NotFoundException when work order missing', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue(null);

      await expect(
        service.create('wo-missing', dto, mockCustomer),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when customer does not own the order', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        customerId: 'cust-other',
        technicianId: 'tech-1',
        status: 'COMPLETED',
      });

      await expect(
        service.create('wo-1', dto, mockCustomer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when order not completed', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        customerId: 'cust-1',
        technicianId: 'tech-1',
        status: 'IN_PROGRESS',
      });

      await expect(
        service.create('wo-1', dto, mockCustomer),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no technician assigned', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        customerId: 'cust-1',
        technicianId: null,
        status: 'COMPLETED',
      });

      await expect(
        service.create('wo-1', dto, mockCustomer),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on duplicate rating (P2002)', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        customerId: 'cust-1',
        technicianId: 'tech-1',
        status: 'COMPLETED',
      });

      mockPrismaTransaction.mockImplementation(async (fn: Function) =>
        fn({
          rating: {
            create: mockPrismaRatingCreate,
            aggregate: mockPrismaRatingAggregate,
            count: mockPrismaRatingCount,
          },
          technician: {
            update: mockPrismaTechnicianUpdate,
          },
        }),
      );

      const p2002 = new Error('Unique constraint');
      (p2002 as any).code = 'P2002';
      mockPrismaRatingCreate.mockRejectedValue(p2002);

      await expect(
        service.create('wo-1', dto, mockCustomer),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByWorkOrder', () => {
    it('should return rating when work order is in scope', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({ department: 'north' });
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaRatingFindUnique.mockResolvedValue({
        id: 'rating-1',
        workOrderId: 'wo-1',
        score: 4,
        comment: 'Great service',
      });

      const result = await service.findByWorkOrder('wo-1', {
        id: 'user-1',
        role: 'COORDINATOR',
        email: 'coord@test.com',
      });

      expect(result).not.toBeNull();
      expect(result!.score).toBe(4);
    });

    it('should return null when no rating exists', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaRatingFindUnique.mockResolvedValue(null);

      const result = await service.findByWorkOrder('wo-1', {
        id: 'user-1',
        role: 'HQ',
        email: 'hq@test.com',
      });

      expect(result).toBeNull();
    });

    it('should throw NotFoundException when work order not in scope', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({ dealerId: 'dealer-other' });
      mockPrismaWorkOrderFindFirst.mockResolvedValue(null);

      await expect(
        service.findByWorkOrder('wo-1', {
          id: 'user-1',
          role: 'DEALER',
          email: 'dealer@test.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a rating as HQ', async () => {
      mockPrismaRatingFindUnique.mockResolvedValue({
        id: 'rating-1',
        workOrderId: 'wo-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaRatingDelete.mockResolvedValue(undefined);

      await service.delete('rating-1', {
        id: 'user-1',
        role: 'HQ',
        email: 'hq@test.com',
      });

      expect(mockPrismaRatingDelete).toHaveBeenCalledWith({
        where: { id: 'rating-1' },
      });
    });

    it('should throw NotFoundException when rating does not exist', async () => {
      mockPrismaRatingFindUnique.mockResolvedValue(null);

      await expect(
        service.delete('rating-missing', {
          id: 'user-1',
          role: 'HQ',
          email: 'hq@test.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when work order not in scope', async () => {
      mockPrismaRatingFindUnique.mockResolvedValue({
        id: 'rating-1',
        workOrderId: 'wo-1',
      });
      mockApplyWorkOrderScope.mockResolvedValue({ dealerId: 'dealer-other' });
      mockPrismaWorkOrderFindFirst.mockResolvedValue(null);

      await expect(
        service.delete('rating-1', {
          id: 'user-1',
          role: 'DEALER',
          email: 'dealer@test.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
