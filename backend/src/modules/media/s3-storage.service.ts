import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const SIGNED_URL_EXPIRY_SECONDS = 3600;

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.region = this.configService.get<string>(
      'AWS_REGION',
      'ap-southeast-1',
    );
    this.client = new S3Client({ region: this.region });
  }

  async upload(
    workOrderId: string,
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    const ext = extname(file.originalname) || '.jpg';
    const key = `work-orders/${workOrderId}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = await this.generateSignedUrl(key);

    return { key, url };
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.generateSignedUrl(key);
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.debug(`Deleted ${key}`);
    } catch (err) {
      this.logger.warn(
        `Failed to delete S3 object ${key}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private async generateSignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
    );
  }
}
