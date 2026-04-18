import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AlbumResponseDto } from '@features/albums/presentation/dtos';
import type { Album } from '@features/albums/domain/entities/album.entity';

interface GetGenreAlbumsResult {
  data: Album[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export class GetGenreAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Álbumes del género' })
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  @ApiProperty({ example: 120 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0 })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 20 })
  @Expose()
  take!: number;

  @ApiProperty({ example: true })
  @Expose()
  hasMore!: boolean;

  static fromDomain(result: GetGenreAlbumsResult): GetGenreAlbumsResponseDto {
    const dto = new GetGenreAlbumsResponseDto();
    dto.data = result.data.map((album) => AlbumResponseDto.fromDomain(album));
    dto.total = result.total;
    dto.skip = result.skip;
    dto.take = result.take;
    dto.hasMore = result.hasMore;
    return dto;
  }
}
