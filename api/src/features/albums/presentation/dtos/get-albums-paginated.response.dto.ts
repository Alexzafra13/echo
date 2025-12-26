import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AlbumResponseDto } from './album.response.dto';

/**
 * GetAlbumsPaginatedResponseDto - DTO de respuesta para listas paginadas de álbumes
 * Usado por endpoints como: alphabetical, by-artist
 */
export class GetAlbumsPaginatedResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Lista de álbumes' })
  @Expose()
  @Type(() => AlbumResponseDto)
  albums!: AlbumResponseDto[];

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

  static create(params: {
    albums: AlbumResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }): GetAlbumsPaginatedResponseDto {
    const dto = new GetAlbumsPaginatedResponseDto();
    dto.albums = params.albums;
    dto.total = params.total;
    dto.page = params.page;
    dto.limit = params.limit;
    dto.totalPages = params.totalPages;
    return dto;
  }
}

/**
 * GetRecentlyPlayedAlbumsResponseDto - DTO de respuesta para álbumes reproducidos recientemente
 */
export class GetRecentlyPlayedAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Álbumes reproducidos recientemente' })
  @Expose()
  @Type(() => AlbumResponseDto)
  albums!: AlbumResponseDto[];

  static create(params: { albums: AlbumResponseDto[] }): GetRecentlyPlayedAlbumsResponseDto {
    const dto = new GetRecentlyPlayedAlbumsResponseDto();
    dto.albums = params.albums;
    return dto;
  }
}

/**
 * GetFavoriteAlbumsResponseDto - DTO de respuesta para álbumes favoritos
 */
export class GetFavoriteAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Álbumes favoritos' })
  @Expose()
  @Type(() => AlbumResponseDto)
  albums!: AlbumResponseDto[];

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
    albums: AlbumResponseDto[];
    page: number;
    limit: number;
    hasMore: boolean;
  }): GetFavoriteAlbumsResponseDto {
    const dto = new GetFavoriteAlbumsResponseDto();
    dto.albums = params.albums;
    dto.page = params.page;
    dto.limit = params.limit;
    dto.hasMore = params.hasMore;
    return dto;
  }
}
