import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
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
    private readonly storageService: StorageService,
    private readonly imageService: ImageService,
  ) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarOutput> {
    // 1. Validate user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // 2. Validate file using shared utility
    validateFileUpload(input.file, FILE_UPLOAD_CONFIGS.avatar);

    // 3. Delete old avatar if exists
    if (user.avatarPath) {
      try {
        await this.storageService.deleteImage(user.avatarPath);
      } catch (error) {
        // Log but don't fail - old avatar might not exist
        this.logger.warn(
          { userId: input.userId, oldAvatarPath: user.avatarPath, error: (error as Error).message },
          'Failed to delete old avatar',
        );
      }
    }

    // 4. Determine file extension from MIME type
    const extension = getExtensionFromMimeType(input.file.mimetype);

    // 6. Get storage path
    const avatarPath = await this.storageService.getUserAvatarPath(
      input.userId,
      extension
    );

    // 7. Save the file
    await this.storageService.saveImage(avatarPath, input.file.buffer);

    // 8. Update user record in database
    await this.userRepository.updatePartial(input.userId, {
      avatarPath,
      avatarMimeType: input.file.mimetype,
      avatarSize: Number(input.file.size),
      avatarUpdatedAt: new Date(),
    });

    // 9. Invalidate image cache so the new avatar is served immediately
    this.imageService.invalidateUserAvatarCache(input.userId);

    return {
      avatarPath,
      avatarSize: input.file.size,
      avatarMimeType: input.file.mimetype,
    };
  }
}
