import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AlbumResponseDto } from '@features/albums/presentation/dtos';

/**
 * GetArtistAlbumsResponseDto - DTO de respuesta para álbumes de un artista
 */
export class GetArtistAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Lista de álbumes del artista' })
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  @ApiProperty({ example: 10, description: 'Total de álbumes del artista' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Álbumes omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 100, description: 'Álbumes retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: false, description: 'Hay más álbumes disponibles' })
  @Expose()
  hasMore!: boolean;

  static create(params: {
    data: AlbumResponseDto[];
    total: number;
    skip: number;
    take: number;
    hasMore: boolean;
  }): GetArtistAlbumsResponseDto {
    const dto = new GetArtistAlbumsResponseDto();
    dto.data = params.data;
    dto.total = params.total;
    dto.skip = params.skip;
    dto.take = params.take;
    dto.hasMore = params.hasMore;
    return dto;
  }
}
