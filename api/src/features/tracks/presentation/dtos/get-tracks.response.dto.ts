import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackResponseDto } from './track.response.dto';
import type { Track, TrackProps } from '../../domain/entities/track.entity';

/**
 * Tipo para datos de la respuesta paginada de tracks
 */
interface GetTracksResult {
  data: (Track | TrackProps)[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

/**
 * GetTracksResponseDto - DTO de respuesta para lista paginada de tracks
 */
export class GetTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto], description: 'Lista de tracks' })
  @Expose()
  @Type(() => TrackResponseDto)
  data!: TrackResponseDto[];

  @ApiProperty({ example: 100, description: 'Total de tracks' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Tracks omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Tracks retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: true, description: 'Hay más tracks disponibles' })
  @Expose()
  hasMore!: boolean;

  /**
   * Convierte resultado del use case a DTO de respuesta
   */
  static fromDomain(data: GetTracksResult): GetTracksResponseDto {
    const dto = new GetTracksResponseDto();
    dto.data = data.data.map((track) => TrackResponseDto.fromDomain(track));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}
