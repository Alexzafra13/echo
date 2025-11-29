import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackResponseDto } from './track.response.dto';

/**
 * ShuffledTracksResponseDto - DTO de respuesta para todos los tracks en orden aleatorio
 */
export class ShuffledTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto] })
  @Expose()
  @Type(() => TrackResponseDto)
  data!: TrackResponseDto[];

  @ApiProperty({ example: 100, description: 'Total number of tracks' })
  @Expose()
  total!: number;

  static fromDomain(data: any): ShuffledTracksResponseDto {
    const dto = new ShuffledTracksResponseDto();
    dto.data = data.data.map((track: any) => TrackResponseDto.fromDomain(track));
    dto.total = data.total;
    return dto;
  }
}
