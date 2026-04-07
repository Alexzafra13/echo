import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * GetArtistStatsResponseDto - DTO de respuesta para estadísticas de un artista
 */
export class GetArtistStatsResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del artista' })
  @Expose()
  artistId!: string;

  @ApiProperty({ example: 1500, description: 'Total de reproducciones del artista' })
  @Expose()
  totalPlays!: number;

  @ApiProperty({ example: 42, description: 'Número de oyentes únicos' })
  @Expose()
  uniqueListeners!: number;

  @ApiProperty({ example: 85.5, description: 'Porcentaje promedio de completado de tracks' })
  @Expose()
  avgCompletionRate!: number;

  @ApiProperty({ example: 12.3, description: 'Porcentaje de skips' })
  @Expose()
  skipRate!: number;

  static create(params: {
    artistId: string;
    totalPlays: number;
    uniqueListeners: number;
    avgCompletionRate: number;
    skipRate: number;
  }): GetArtistStatsResponseDto {
    const dto = new GetArtistStatsResponseDto();
    dto.artistId = params.artistId;
    dto.totalPlays = params.totalPlays;
    dto.uniqueListeners = params.uniqueListeners;
    dto.avgCompletionRate = params.avgCompletionRate;
    dto.skipRate = params.skipRate;
    return dto;
  }
}
