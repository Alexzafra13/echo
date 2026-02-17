import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { IStorageService, STORAGE_SERVICE } from '@features/external-metadata/domain/ports';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { NotFoundError } from '@shared/errors';
import {
  validateFileUpload,
  getExtensionFromMimeType,
  FILE_UPLOAD_CONFIGS,
} from '@shared/utils';
import { UploadAvatarInput, UploadAvatarOutput } from './upload-avatar.dto';

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    @InjectPinoLogger(UploadAvatarUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly imageService: ImageService,
  ) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    validateFileUpload(input.file, FILE_UPLOAD_CONFIGS.avatar);

    if (user.avatarPath) {
      try {
        await this.storageService.deleteImage(user.avatarPath);
      } catch (error) {
        this.logger.warn(
          { userId: input.userId, oldAvatarPath: user.avatarPath, error: (error as Error).message },
          'Failed to delete old avatar',
        );
      }
    }

    const extension = getExtensionFromMimeType(input.file.mimetype);

    const avatarPath = await this.storageService.getUserAvatarPath(
      input.userId,
      extension
    );

    await this.storageService.saveImage(avatarPath, input.file.buffer);

    await this.userRepository.updatePartial(input.userId, {
      avatarPath,
      avatarMimeType: input.file.mimetype,
      avatarSize: Number(input.file.size),
      avatarUpdatedAt: new Date(),
    });

    this.imageService.invalidateUserAvatarCache(input.userId);

    return {
      avatarPath,
      avatarSize: input.file.size,
      avatarMimeType: input.file.mimetype,
    };
  }
}
