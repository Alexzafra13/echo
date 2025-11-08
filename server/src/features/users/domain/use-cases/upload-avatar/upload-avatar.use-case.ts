import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { NotFoundError } from '@shared/errors';
import { UploadAvatarInput, UploadAvatarOutput } from './upload-avatar.dto';
import * as path from 'path';
import * as fileType from 'file-type';

@Injectable()
export class UploadAvatarUseCase {
  // Max size: 5MB (smaller than covers which are 10MB)
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

  constructor(
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

    // 4. Validate file content (magic bytes) for security
    const fileTypeResult = await fileType.fromBuffer(input.file.buffer);
    if (!fileTypeResult || !this.ALLOWED_MIME_TYPES.includes(fileTypeResult.mime)) {
      throw new BadRequestException(
        'File content does not match the declared MIME type'
      );
    }

    // 5. Delete old avatar if exists
    if (user.avatarPath) {
      try {
        await this.storageService.deleteImage(user.avatarPath);
      } catch (error) {
        // Log but don't fail - old avatar might not exist
        console.warn(`Failed to delete old avatar: ${(error as Error).message}`);
      }
    }

    // 6. Determine file extension
    const extension = fileTypeResult.ext;

    // 7. Get storage path
    const avatarPath = await this.storageService.getUserAvatarPath(
      input.userId,
      extension
    );

    // 8. Save the file
    await this.storageService.saveImage(avatarPath, input.file.buffer);

    // 9. Update user record in database
    await this.userRepository.updatePartial(input.userId, {
      avatarPath,
      avatarMimeType: fileTypeResult.mime,
      avatarSize: BigInt(input.file.size),
      avatarUpdatedAt: new Date(),
    });

    return {
      avatarPath,
      avatarSize: input.file.size,
      avatarMimeType: fileTypeResult.mime,
    };
  }
}
