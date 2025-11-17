import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { NotFoundError } from '@shared/errors';
import { UploadAvatarInput, UploadAvatarOutput } from './upload-avatar.dto';

@Injectable()
export class UploadAvatarUseCase {
  // Max size: 5MB (smaller than covers which are 10MB)
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // Map MIME types to file extensions
  private readonly MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  constructor(
    @InjectPinoLogger(UploadAvatarUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarOutput> {
    // 1. Validate user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // 2. Validate file size
    if (input.file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // 3. Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(input.file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // 4. Delete old avatar if exists
    if (user.avatarPath) {
      try {
        await this.storageService.deleteImage(user.avatarPath);
      } catch (error) {
        // Log but don't fail - old avatar might not exist
        this.logger.warn(
          { userId: input.userId, oldAvatarPath: user.avatarPath, error: (error as Error).message },
          'Failed to delete old avatar'
        );
      }
    }

    // 5. Determine file extension from MIME type
    const extension = this.MIME_TO_EXT[input.file.mimetype] || 'jpg';

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
      avatarSize: BigInt(input.file.size),
      avatarUpdatedAt: new Date(),
    });

    return {
      avatarPath,
      avatarSize: input.file.size,
      avatarMimeType: input.file.mimetype,
    };
  }
}
