import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArtistResponseDto } from './artist.response.dto';
import { SearchArtistsOutput } from '../../domain/use-cases/search-artists/search-artists.dto';

/**
 * SearchArtistsResponseDto - DTO de respuesta para búsqueda de artistas
 */
export class SearchArtistsResponseDto {
  @ApiProperty({ type: [ArtistResponseDto] })
  @Expose()
  @Type(() => ArtistResponseDto)
  data!: ArtistResponseDto[];

  @ApiProperty({ example: 50, description: 'Total number of matching artists' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Number of results skipped' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Number of results returned' })
  @Expose()
  take!: number;

  @ApiProperty({ example: 'Beatles', description: 'Search query used' })
  @Expose()
  query!: string;

  @ApiProperty({ example: true, description: 'Whether there are more results available' })
  @Expose()
  hasMore!: boolean;

  static fromDomain(data: SearchArtistsOutput): SearchArtistsResponseDto {
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
