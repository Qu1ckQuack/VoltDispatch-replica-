import {
  Controller,
  Get,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service.js';
import { S3StorageService } from '../media/s3-storage.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { BadRequestAppException } from '../common/errors/app-exception.js';
import { extractErrorMessage } from '../common/utils/error-message.js';
import { extname } from 'node:path';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('users/me/avatar')
export class UsersAvatarController {
  private readonly logger = new Logger(UsersAvatarController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly s3: S3StorageService,
  ) {}

  @Put()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestAppException(
              `Invalid file type: ${file.mimetype}. Allowed: jpeg, png, webp`,
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ext = extname(file.originalname) || '.jpg';
    const key = `avatars/${user.id}${ext}`;

    const oldUser = await this.usersService.findById(user.id);
    const oldKey = oldUser.avatarKey;

    const { url } = await this.s3.put(key, file);

    if (oldKey && oldKey !== key) {
      this.s3
        .delete(oldKey)
        .catch((err) =>
          this.logger.warn(
            `Failed to delete old avatar: ${extractErrorMessage(err)}`,
          ),
        );
    }

    await this.usersService.updateAvatarKey(user.id, key);

    return { url };
  }

  @Get()
  async getUrl(@CurrentUser() user: AuthenticatedUser) {
    const u = await this.usersService.findById(user.id);
    if (!u.avatarKey) {
      return { url: null };
    }
    const url = await this.s3.getSignedUrl(u.avatarKey);
    return { url };
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser) {
    const u = await this.usersService.findById(user.id);
    if (u.avatarKey) {
      await this.s3.delete(u.avatarKey);
      await this.usersService.updateAvatarKey(user.id, null);
    }
  }
}
