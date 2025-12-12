import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackResponseDto } from './track.response.dto';
import { SearchTracksOutput } from '../../domain/use-cases/search-tracks/search-tracks.dto';

/**
 * SearchTracksResponseDto - DTO de respuesta para búsqueda de tracks
 */
export class SearchTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto] })
  @Expose()
  @Type(() => TrackResponseDto)
  data!: TrackResponseDto[];

  @ApiProperty({ example: 50, description: 'Total number of matching tracks' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Number of results skipped' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Number of results returned' })
  @Expose()
  take!: number;

  @ApiProperty({ example: 'Come', description: 'Search query used' })
  @Expose()
  query!: string;

  @ApiProperty({ example: true, description: 'Whether there are more results available' })
  @Expose()
  hasMore!: boolean;

  static fromDomain(data: SearchTracksOutput): SearchTracksResponseDto {
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
