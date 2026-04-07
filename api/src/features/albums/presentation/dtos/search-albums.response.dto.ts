import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AlbumResponseDto } from './album.response.dto';
import type { Album } from '../../domain/entities/album.entity';
import type { AlbumProps } from '../../domain/entities/album.entity';

/**
 * Tipo para datos de búsqueda de álbumes
 */
interface SearchAlbumsResult {
  data: (Album | AlbumProps)[];
  total: number;
  skip: number;
  take: number;
  query: string;
  hasMore: boolean;
}

/**
 * SearchAlbumsResponseDto - DTO de respuesta para búsqueda de álbumes
 */
export class SearchAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Álbumes encontrados' })
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  @ApiProperty({ example: 50, description: 'Total de coincidencias' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Resultados omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Resultados retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: 'Abbey', description: 'Query de búsqueda usado' })
  @Expose()
  query!: string;

  @ApiProperty({ example: true, description: 'Hay más resultados disponibles' })
  @Expose()
  hasMore!: boolean;

  /**
   * Convierte resultado del use case a DTO de respuesta
   */
  static fromDomain(data: SearchAlbumsResult): SearchAlbumsResponseDto {
    const dto = new SearchAlbumsResponseDto();
    dto.data = data.data.map((album) => AlbumResponseDto.fromDomain(album));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.query = data.query;
    dto.hasMore = data.hasMore;
    return dto;
  }
}