import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackResponseDto } from './track.response.dto';
import { GetTracksOutput } from '../../domain/use-cases/get-tracks/get-tracks.dto';

/**
 * GetTracksResponseDto - DTO de respuesta para lista paginada de tracks
 */
export class GetTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto] })
  @Expose()
  @Type(() => TrackResponseDto)
  data!: TrackResponseDto[];

  @ApiProperty({ example: 100, description: 'Total number of tracks' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Number of tracks skipped' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Number of tracks returned' })
  @Expose()
  take!: number;

  @ApiProperty({ example: true, description: 'Whether there are more tracks available' })
  @Expose()
  hasMore!: boolean;

  static fromDomain(data: GetTracksOutput): GetTracksResponseDto {
    const dto = new GetTracksResponseDto();
    dto.data = data.data.map((track) => TrackResponseDto.fromDomain(track));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}
