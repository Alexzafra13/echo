import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AlbumResponseDto } from './album.response.dto';

/**
 * GetAlbumsPaginatedResponseDto - DTO de respuesta para listas paginadas de álbumes
 * Usado por endpoints como: alphabetical, by-artist
 *
 * Formato estandarizado: data + page/limit/total/totalPages/hasMore
 */
export class GetAlbumsPaginatedResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Lista de álbumes' })
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  @ApiProperty({ example: 100, description: 'Total de álbumes' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 1, description: 'Página actual' })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20, description: 'Álbumes por página' })
  @Expose()
  limit!: number;

  @ApiProperty({ example: 5, description: 'Total de páginas' })
  @Expose()
  totalPages!: number;

  @ApiProperty({ example: true, description: 'Hay más álbumes disponibles' })
  @Expose()
  hasMore!: boolean;

  static create(params: {
    data: AlbumResponseDto[];
    total: number;
    page: number;
    limit: number;
  }): GetAlbumsPaginatedResponseDto {
    const dto = new GetAlbumsPaginatedResponseDto();
    dto.data = params.data;
    dto.total = params.total;
    dto.page = params.page;
    dto.limit = params.limit;
    dto.totalPages = Math.ceil(params.total / params.limit);
    dto.hasMore = params.page < dto.totalPages;
    return dto;
  }
}

/**
 * GetRecentlyPlayedAlbumsResponseDto - DTO de respuesta para álbumes reproducidos recientemente
 *
 * Formato estandarizado: data (sin paginación para este endpoint)
 */
export class GetRecentlyPlayedAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Álbumes reproducidos recientemente' })
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  static create(params: { data: AlbumResponseDto[] }): GetRecentlyPlayedAlbumsResponseDto {
    const dto = new GetRecentlyPlayedAlbumsResponseDto();
    dto.data = params.data;
    return dto;
  }
}

/**
 * GetFavoriteAlbumsResponseDto - DTO de respuesta para álbumes favoritos
 *
 * Formato estandarizado: data + page/limit/hasMore
 */
export class GetFavoriteAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Álbumes favoritos' })
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  @ApiProperty({ example: 1, description: 'Página actual' })
  @Expose()
  page!: number;

  @ApiProperty({ example: 20, description: 'Álbumes por página' })
  @Expose()
  limit!: number;

  @ApiProperty({ example: true, description: 'Hay más álbumes disponibles' })
  @Expose()
  hasMore!: boolean;

  static create(params: {
    data: AlbumResponseDto[];
    page: number;
    limit: number;
    hasMore: boolean;
  }): GetFavoriteAlbumsResponseDto {
    const dto = new GetFavoriteAlbumsResponseDto();
    dto.data = params.data;
    dto.page = params.page;
    dto.limit = params.limit;
    dto.hasMore = params.hasMore;
    return dto;
  }
}
