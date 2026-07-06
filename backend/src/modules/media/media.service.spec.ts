jest.mock('../common/prisma.service.js', () => ({
  PrismaService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { S3StorageService } from './s3-storage.service.js';
import { ScopingService } from '../common/services/scoping.service.js';

const mockPrismaWorkOrderFindUnique = jest.fn();
const mockPrismaWorkOrderFindFirst = jest.fn();
const mockPrismaWorkOrderImageFindUnique = jest.fn();
const mockPrismaWorkOrderImageFindMany = jest.fn();
const mockPrismaWorkOrderImageCreate = jest.fn();
const mockPrismaWorkOrderImageDelete = jest.fn();
const mockS3Upload = jest.fn();
const mockS3GetSignedUrl = jest.fn();
const mockS3Delete = jest.fn();
const mockApplyWorkOrderScope = jest.fn();

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    mockPrismaWorkOrderFindUnique.mockReset();
    mockPrismaWorkOrderFindFirst.mockReset();
    mockPrismaWorkOrderImageFindUnique.mockReset();
    mockPrismaWorkOrderImageFindMany.mockReset();
    mockPrismaWorkOrderImageCreate.mockReset();
    mockPrismaWorkOrderImageDelete.mockReset();
    mockS3Upload.mockReset();
    mockS3GetSignedUrl.mockReset();
    mockS3Delete.mockReset();
    mockApplyWorkOrderScope.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: {
            workOrder: {
              findUnique: mockPrismaWorkOrderFindUnique,
              findFirst: mockPrismaWorkOrderFindFirst,
            },
            workOrderImage: {
              findUnique: mockPrismaWorkOrderImageFindUnique,
              findMany: mockPrismaWorkOrderImageFindMany,
              create: mockPrismaWorkOrderImageCreate,
              delete: mockPrismaWorkOrderImageDelete,
            },
          },
        },
        {
          provide: S3StorageService,
          useValue: {
            upload: mockS3Upload,
            getSignedUrl: mockS3GetSignedUrl,
            delete: mockS3Delete,
          },
        },
        {
          provide: ScopingService,
          useValue: { applyWorkOrderScope: mockApplyWorkOrderScope },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  const mockFile = {
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
  } as Express.Multer.File;

  const mockUser = {
    id: 'user-1',
    role: 'TECHNICIAN',
    profileId: 'tech-1',
    email: 'tech@test.com',
  };

  describe('upload', () => {
    it('should upload to S3, store key in DB, return signed URL', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        technicianId: 'tech-1',
      });
      mockS3Upload.mockResolvedValue({
        key: 'work-orders/wo-1/uuid.jpg',
        url: 'https://signed-url.amazonaws.com/wo-1/uuid.jpg?X-Amz-Signature=abc',
      });
      mockPrismaWorkOrderImageCreate.mockResolvedValue({
        id: 'img-1',
        workOrderId: 'wo-1',
        type: 'BEFORE',
        url: 'work-orders/wo-1/uuid.jpg',
        uploadedBy: 'user-1',
      });

      const result = await service.upload('wo-1', 'BEFORE', mockFile, mockUser);

      expect(mockS3Upload).toHaveBeenCalledWith('wo-1', mockFile);
      expect(mockPrismaWorkOrderImageCreate).toHaveBeenCalledWith({
        data: {
          workOrderId: 'wo-1',
          type: 'BEFORE',
          url: 'work-orders/wo-1/uuid.jpg',
          uploadedBy: 'user-1',
        },
      });
      expect(result.url).toBe(
        'https://signed-url.amazonaws.com/wo-1/uuid.jpg?X-Amz-Signature=abc',
      );
    });

    it('should throw NotFoundException when work order does not exist', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue(null);

      await expect(
        service.upload('wo-missing', 'BEFORE', mockFile, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when technician not assigned', async () => {
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        technicianId: 'tech-other',
      });

      await expect(
        service.upload('wo-1', 'BEFORE', mockFile, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow HQ to upload regardless of assignment', async () => {
      const hqUser = { ...mockUser, role: 'HQ', profileId: null };
      mockPrismaWorkOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        technicianId: 'tech-someone',
      });
      mockS3Upload.mockResolvedValue({
        key: 'work-orders/wo-1/uuid.jpg',
        url: 'https://signed-url',
      });
      mockPrismaWorkOrderImageCreate.mockResolvedValue({ id: 'img-1' });

      const result = await service.upload('wo-1', 'AFTER', mockFile, hqUser);

      expect(result.id).toBe('img-1');
    });
  });

  describe('findByWorkOrder', () => {
    it('should verify scope via findFirst, return images with signed URLs', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({ department: 'north' });
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaWorkOrderImageFindMany.mockResolvedValue([
        { id: 'img-1', workOrderId: 'wo-1', type: 'BEFORE', url: 'work-orders/wo-1/a.jpg' },
        { id: 'img-2', workOrderId: 'wo-1', type: 'AFTER', url: 'work-orders/wo-1/b.jpg' },
      ]);
      mockS3GetSignedUrl
        .mockResolvedValueOnce('https://signed-url/a.jpg?X-Amz-Signature=a')
        .mockResolvedValueOnce('https://signed-url/b.jpg?X-Amz-Signature=b');

      const result = await service.findByWorkOrder('wo-1', {
        ...mockUser,
        role: 'COORDINATOR',
      });

      expect(mockPrismaWorkOrderFindFirst).toHaveBeenCalledWith({
        where: { id: 'wo-1', department: 'north' },
        select: { id: true },
      });
      expect(mockS3GetSignedUrl).toHaveBeenCalledTimes(2);
      expect(result[0].url).toBe('https://signed-url/a.jpg?X-Amz-Signature=a');
      expect(result[1].url).toBe('https://signed-url/b.jpg?X-Amz-Signature=b');
    });

    it('should throw NotFoundException when work order not in scope', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({ dealerId: 'dealer-other' });
      mockPrismaWorkOrderFindFirst.mockResolvedValue(null);

      await expect(
        service.findByWorkOrder('wo-1', { ...mockUser, role: 'DEALER' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete own upload as technician', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaWorkOrderImageFindUnique.mockResolvedValue({
        id: 'img-1',
        workOrderId: 'wo-1',
        url: 'work-orders/wo-1/uuid.jpg',
        uploadedBy: 'user-1',
      });
      mockS3Delete.mockResolvedValue(undefined);
      mockPrismaWorkOrderImageDelete.mockResolvedValue(undefined);

      await service.delete('wo-1', 'img-1', mockUser);

      expect(mockS3Delete).toHaveBeenCalledWith('work-orders/wo-1/uuid.jpg');
      expect(mockPrismaWorkOrderImageDelete).toHaveBeenCalledWith({
        where: { id: 'img-1' },
      });
    });

    it('should throw ForbiddenException when technician deletes another upload', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaWorkOrderImageFindUnique.mockResolvedValue({
        id: 'img-1',
        workOrderId: 'wo-1',
        url: 'work-orders/wo-1/uuid.jpg',
        uploadedBy: 'user-other',
      });

      await expect(
        service.delete('wo-1', 'img-1', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow HQ to delete any image', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaWorkOrderImageFindUnique.mockResolvedValue({
        id: 'img-1',
        workOrderId: 'wo-1',
        url: 'work-orders/wo-1/uuid.jpg',
        uploadedBy: 'user-other',
      });
      mockS3Delete.mockResolvedValue(undefined);
      mockPrismaWorkOrderImageDelete.mockResolvedValue(undefined);

      await service.delete('wo-1', 'img-1', { ...mockUser, role: 'HQ' });

      expect(mockS3Delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when work order not in scope', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({ dealerId: 'dealer-other' });
      mockPrismaWorkOrderFindFirst.mockResolvedValue(null);

      await expect(
        service.delete('wo-1', 'img-1', { ...mockUser, role: 'DEALER' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when image does not belong to work order', async () => {
      mockApplyWorkOrderScope.mockResolvedValue({});
      mockPrismaWorkOrderFindFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrismaWorkOrderImageFindUnique.mockResolvedValue({
        id: 'img-1',
        workOrderId: 'wo-other',
        url: 'work-orders/wo-other/uuid.jpg',
        uploadedBy: 'user-1',
      });

      await expect(
        service.delete('wo-1', 'img-1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
