import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { slugify, getGenreColor } from '@shared/utils';
import type { Genre, GenreProps } from '../../domain/entities/genre.entity';

type GenreData = Genre | GenreProps;

export class GenreResponseDto {
  @Expose()
  @ApiProperty({ description: 'UUID del género', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Nombre del género tal como viene del tag', example: 'Hip-Hop' })
  name!: string;

  @Expose()
  @ApiProperty({ description: 'Slug URL-friendly derivado del nombre', example: 'hip-hop' })
  slug!: string;

  @Expose()
  @ApiProperty({ description: 'Número de tracks en el género', example: 245 })
  trackCount!: number;

  @Expose()
  @ApiProperty({ description: 'Número de álbumes en el género', example: 32 })
  albumCount!: number;

  @Expose()
  @ApiProperty({ description: 'Número de artistas en el género', example: 18 })
  artistCount!: number;

  @Expose()
  @ApiPropertyOptional({
    description: 'URL de la portada (álbum con más tracks del género)',
    example: '/api/images/albums/abc/cover?v=1700000000000',
  })
  coverImageUrl?: string;

  @Expose()
  @ApiProperty({
    description: 'Color hex/HSL determinista para fallback',
    example: '#F59E0B',
  })
  coverColor!: string;

  static fromDomain(data: GenreData): GenreResponseDto {
    const dto = new GenreResponseDto();
    dto.id = data.id;
    dto.name = data.name;
    dto.slug = slugify(data.name);
    dto.trackCount = data.trackCount;
    dto.albumCount = data.albumCount;
    dto.artistCount = data.artistCount;

    if (data.coverAlbumId) {
      const timestamp =
        data.coverAlbumExternalInfoUpdatedAt || data.coverAlbumUpdatedAt;
      const version = timestamp ? `?v=${new Date(timestamp).getTime()}` : '';
      dto.coverImageUrl = `/api/images/albums/${data.coverAlbumId}/cover${version}`;
    }

    dto.coverColor = getGenreColor(data.name);
    return dto;
  }
}
