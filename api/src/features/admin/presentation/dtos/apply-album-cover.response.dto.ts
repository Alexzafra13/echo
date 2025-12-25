import { Expose } from 'class-transformer';
import { ApplyAlbumCoverOutput } from '../../infrastructure/use-cases/apply-album-cover';

export class ApplyAlbumCoverResponseDto {
  @Expose()
  success!: boolean;

  @Expose()
  message!: string;

  @Expose()
  coverPath?: string;

  static fromDomain(data: ApplyAlbumCoverOutput): ApplyAlbumCoverResponseDto {
    const dto = new ApplyAlbumCoverResponseDto();
    dto.success = data.success;
    dto.message = data.message;
    dto.coverPath = data.coverPath;
    return dto;
  }
}
