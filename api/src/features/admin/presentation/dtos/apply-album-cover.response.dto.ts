import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplyAlbumCoverOutput } from '../../infrastructure/use-cases/apply-album-cover';

export class ApplyAlbumCoverResponseDto {
  @ApiProperty({ description: 'Whether the album cover was applied successfully', example: true })
  @Expose()
  success!: boolean;

  @ApiProperty({
    description: 'Human-readable result message',
    example: 'Album cover applied successfully',
  })
  @Expose()
  message!: string;

  @ApiPropertyOptional({
    description: 'Path to the applied cover image',
    example: '/covers/album-abc123.jpg',
  })
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
