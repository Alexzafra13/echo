import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { IStorageService, STORAGE_SERVICE } from '@features/external-metadata/domain/ports';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { NotFoundError } from '@shared/errors';
import { DeleteAvatarInput } from './delete-avatar.dto';

@Injectable()
export class DeleteAvatarUseCase {
  constructor(
    @InjectPinoLogger(DeleteAvatarUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly imageService: ImageService,
  ) {}

  async execute(input: DeleteAvatarInput): Promise<void> {
    // 1. Validate user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // 2. Check if user has an avatar
    if (!user.avatarPath) {
      // No avatar to delete, just return
      return;
    }

    // 3. Delete the file from storage
    try {
      await this.storageService.deleteImage(user.avatarPath);
    } catch (error) {
      // Log but don't fail if file doesn't exist
      this.logger.warn(
        { userId: input.userId, avatarPath: user.avatarPath, error: (error as Error).message },
        'Failed to delete avatar file'
      );
    }

    // 4. Update user record to remove avatar metadata
    await this.userRepository.updatePartial(input.userId, {
      avatarPath: null,
      avatarMimeType: null,
      avatarSize: null,
      avatarUpdatedAt: null,
    });

    // 5. Invalidate image cache
    this.imageService.invalidateUserAvatarCache(input.userId);
  }
}
