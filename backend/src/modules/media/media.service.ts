import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { S3StorageService } from './s3-storage.service.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { ScopingService } from '../common/services/scoping.service.js';
import type { ImageType } from '../../generated/prisma/enums.js';
import {
  NotFoundAppException,
  ForbiddenAppException,
  AppException,
} from '../common/errors/app-exception.js';
import { ErrorCodes } from '../common/errors/error-codes.js';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3StorageService,
    private readonly scopingService: ScopingService,
  ) {}

  async upload(
    workOrderId: string,
    type: ImageType,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, technicianId: true },
    });

    if (!workOrder) {
      throw new NotFoundAppException('Work order');
    }

    if (user.role === 'TECHNICIAN') {
      const techProfileId = user.profileId;
      if (!techProfileId || workOrder.technicianId !== techProfileId) {
        throw new ForbiddenAppException(
          'You are not assigned to this work order',
        );
      }
    }

    const { key, url } = await this.s3.upload(workOrderId, file);

    const image = await this.prisma.workOrderImage.create({
      data: {
        workOrderId,
        type,
        url: key,
        uploadedBy: user.id,
      },
    });

    return { ...image, url };
  }

  private async getScopedWorkOrderOrThrow(
    workOrderId: string,
    user: AuthenticatedUser,
  ) {
    const scope = await this.scopingService.applyWorkOrderScope(user);
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, ...scope },
      select: { id: true },
    });

    if (!workOrder) {
      throw new NotFoundAppException('Work order');
    }

    return workOrder;
  }

  async findByWorkOrder(workOrderId: string, user: AuthenticatedUser) {
    await this.getScopedWorkOrderOrThrow(workOrderId, user);

    const images = await this.prisma.workOrderImage.findMany({
      where: { workOrderId },
      orderBy: { uploadedAt: 'desc' },
    });

    const signed = await Promise.all(
      images.map(
        async (img: {
          id: string;
          url: string;
          type: ImageType;
          workOrderId: string;
          uploadedBy: string | null;
          uploadedAt: Date;
        }) => ({
          ...img,
          url: await this.s3.getSignedUrl(img.url),
        }),
      ),
    );

    return signed;
  }

  async delete(workOrderId: string, imageId: string, user: AuthenticatedUser) {
    await this.getScopedWorkOrderOrThrow(workOrderId, user);

    const image = await this.prisma.workOrderImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.workOrderId !== workOrderId) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Image not found on this work order',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.role === 'TECHNICIAN' && image.uploadedBy !== user.id) {
      throw new ForbiddenAppException('You can only delete your own uploads');
    }

    await Promise.all([
      this.s3.delete(image.url),
      this.prisma.workOrderImage.delete({ where: { id: imageId } }),
    ]);
  }
}
