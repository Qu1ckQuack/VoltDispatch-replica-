import { Module } from '@nestjs/common';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { S3StorageService } from './s3-storage.service.js';

@Module({
  controllers: [MediaController],
  providers: [MediaService, S3StorageService],
})
export class MediaModule {}
