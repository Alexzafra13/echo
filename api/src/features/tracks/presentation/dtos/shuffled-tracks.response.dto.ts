import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackResponseDto } from './track.response.dto';
import { GetShuffledTracksOutput } from '../../domain/use-cases/get-shuffled-tracks/get-shuffled-tracks.dto';

/**
 * ShuffledTracksResponseDto - DTO de respuesta para tracks en orden aleatorio paginado
 *
 * Incluye metadata para paginación determinística:
 * - seed: permite continuar la misma secuencia aleatoria
 * - hasMore: indica si hay más tracks disponibles
 */
export class ShuffledTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto], description: 'Lista de tracks en orden aleatorio' })
  @Expose()
  @Type(() => TrackResponseDto)
  data!: TrackResponseDto[];

  @ApiProperty({ example: 3640, description: 'Total de tracks en la biblioteca' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0.123456789, description: 'Seed usado para el orden aleatorio' })
  @Expose()
  seed!: number;

  @ApiProperty({ example: 0, description: 'Número de tracks saltados' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 50, description: 'Número de tracks retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: true, description: 'Indica si hay más tracks disponibles' })
  @Expose()
  hasMore!: boolean;

  static fromDomain(data: GetShuffledTracksOutput): ShuffledTracksResponseDto {
    const dto = new ShuffledTracksResponseDto();
    dto.data = data.data.map((track) => TrackResponseDto.fromDomain(track));
    dto.total = data.total;
    dto.seed = data.seed;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}
