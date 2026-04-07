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
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    if (!user.avatarPath) {
      return;
    }

    try {
      await this.storageService.deleteImage(user.avatarPath);
    } catch (error) {
      this.logger.warn(
        { userId: input.userId, avatarPath: user.avatarPath, error: (error as Error).message },
        'Failed to delete avatar file'
      );
    }

    await this.userRepository.updatePartial(input.userId, {
      avatarPath: null,
      avatarMimeType: null,
      avatarSize: null,
      avatarUpdatedAt: null,
    });

    this.imageService.invalidateUserAvatarCache(input.userId);
  }
}
