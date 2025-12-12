import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArtistResponseDto } from './artist.response.dto';
import { GetArtistsOutput } from '../../domain/use-cases/get-artists/get-artists.dto';

/**
 * GetArtistsResponseDto - DTO de respuesta para lista paginada de artistas
 */
export class GetArtistsResponseDto {
  @ApiProperty({ type: [ArtistResponseDto] })
  @Expose()
  @Type(() => ArtistResponseDto)
  data!: ArtistResponseDto[];

  @ApiProperty({ example: 100, description: 'Total number of artists' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Number of artists skipped' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Number of artists returned' })
  @Expose()
  take!: number;

  @ApiProperty({ example: true, description: 'Whether there are more artists available' })
  @Expose()
  hasMore!: boolean;

  static fromDomain(data: GetArtistsOutput): GetArtistsResponseDto {
    const dto = new GetArtistsResponseDto();
    dto.data = data.data.map((artist) => ArtistResponseDto.fromDomain(artist));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}
