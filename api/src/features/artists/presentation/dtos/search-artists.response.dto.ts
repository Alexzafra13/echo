import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArtistResponseDto } from './artist.response.dto';
import type { Artist, ArtistProps } from '../../domain/entities/artist.entity';

/**
 * Tipo para datos de búsqueda de artistas
 */
interface SearchArtistsResult {
  data: (Artist | ArtistProps)[];
  total: number;
  skip: number;
  take: number;
  query: string;
  hasMore: boolean;
}

/**
 * SearchArtistsResponseDto - DTO de respuesta para búsqueda de artistas
 */
export class SearchArtistsResponseDto {
  @ApiProperty({ type: [ArtistResponseDto], description: 'Artistas encontrados' })
  @Expose()
  @Type(() => ArtistResponseDto)
  data!: ArtistResponseDto[];

  @ApiProperty({ example: 50, description: 'Total de coincidencias' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Resultados omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Resultados retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: 'Beatles', description: 'Query de búsqueda usado' })
  @Expose()
  query!: string;

  @ApiProperty({ example: true, description: 'Hay más resultados disponibles' })
  @Expose()
  hasMore!: boolean;

  /**
   * Convierte resultado del use case a DTO de respuesta
   */
  static fromDomain(data: SearchArtistsResult): SearchArtistsResponseDto {
    const dto = new SearchArtistsResponseDto();
    dto.data = data.data.map((artist) => ArtistResponseDto.fromDomain(artist));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.query = data.query;
    dto.hasMore = data.hasMore;
    return dto;
  }
}
