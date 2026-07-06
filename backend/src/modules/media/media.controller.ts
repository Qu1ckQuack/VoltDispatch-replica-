import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipeBuilder,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { MediaService } from './media.service.js';
import { UploadImageDto } from './dto/upload-image.dto.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Controller('work-orders/:workOrderId/images')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @Roles('TECHNICIAN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMETYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @Param('workOrderId') workOrderId: string,
    @Body() dto: UploadImageDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
        .build({}),
    )
    file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.upload(workOrderId, dto.type, file, user);
  }

  @Get()
  @Roles('HQ', 'DEALER', 'COORDINATOR', 'TECHNICIAN')
  async list(
    @Param('workOrderId') workOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.findByWorkOrder(workOrderId, user);
  }

  @Delete(':imageId')
  @Roles('TECHNICIAN', 'HQ')
  @HttpCode(204)
  async remove(
    @Param('workOrderId') workOrderId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.mediaService.delete(workOrderId, imageId, user);
  }
}
