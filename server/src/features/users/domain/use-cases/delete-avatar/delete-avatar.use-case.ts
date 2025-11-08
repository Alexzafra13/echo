import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { NotFoundError } from '@shared/errors';
import { DeleteAvatarInput } from './delete-avatar.dto';

@Injectable()
export class DeleteAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly storageService: StorageService,
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
      console.warn(`Failed to delete avatar file: ${(error as Error).message}`);
    }

    // 4. Update user record to remove avatar metadata
    await this.userRepository.updatePartial(input.userId, {
      avatarPath: null,
      avatarMimeType: null,
      avatarSize: null,
      avatarUpdatedAt: null,
    });
  }
}
