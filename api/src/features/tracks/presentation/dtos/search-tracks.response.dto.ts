import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackResponseDto } from './track.response.dto';
import type { Track, TrackProps } from '../../domain/entities/track.entity';

/**
 * Tipo para datos de búsqueda de tracks
 */
interface SearchTracksResult {
  data: (Track | TrackProps)[];
  total: number;
  skip: number;
  take: number;
  query: string;
  hasMore: boolean;
}

/**
 * SearchTracksResponseDto - DTO de respuesta para búsqueda de tracks
 */
export class SearchTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto], description: 'Tracks encontrados' })
  @Expose()
  @Type(() => TrackResponseDto)
  data!: TrackResponseDto[];

  @ApiProperty({ example: 50, description: 'Total de coincidencias' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Resultados omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Resultados retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: 'Come', description: 'Query de búsqueda usado' })
  @Expose()
  query!: string;

  @ApiProperty({ example: true, description: 'Hay más resultados disponibles' })
  @Expose()
  hasMore!: boolean;

  /**
   * Convierte resultado del use case a DTO de respuesta
   */
  static fromDomain(data: SearchTracksResult): SearchTracksResponseDto {
    const dto = new SearchTracksResponseDto();
    dto.data = data.data.map((track) => TrackResponseDto.fromDomain(track));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.query = data.query;
    dto.hasMore = data.hasMore;
    return dto;
  }
}
