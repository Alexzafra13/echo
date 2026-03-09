import { Expose } from 'class-transformer';
import { ApplyArtistAvatarOutput } from '../../infrastructure/use-cases/apply-artist-avatar';

export class ApplyArtistAvatarResponseDto {
  @Expose()
  success!: boolean;

  @Expose()
  message!: string;

  @Expose()
  imagePath?: string;

  static fromDomain(data: ApplyArtistAvatarOutput): ApplyArtistAvatarResponseDto {
    const dto = new ApplyArtistAvatarResponseDto();
    dto.success = data.success;
    dto.message = data.message;
    dto.imagePath = data.imagePath;
    return dto;
  }
}
