import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArtistResponseDto } from './artist.response.dto';
import type { Artist, ArtistProps } from '../../domain/entities/artist.entity';

/**
 * Tipo para datos de la respuesta paginada de artistas
 */
interface GetArtistsResult {
  data: (Artist | ArtistProps)[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

/**
 * GetArtistsResponseDto - DTO de respuesta para lista paginada de artistas
 */
export class GetArtistsResponseDto {
  @ApiProperty({ type: [ArtistResponseDto], description: 'Lista de artistas' })
  @Expose()
  @Type(() => ArtistResponseDto)
  data!: ArtistResponseDto[];

  @ApiProperty({ example: 100, description: 'Total de artistas' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Artistas omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Artistas retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: true, description: 'Hay más artistas disponibles' })
  @Expose()
  hasMore!: boolean;

  /**
   * Convierte resultado del use case a DTO de respuesta
   */
  static fromDomain(data: GetArtistsResult): GetArtistsResponseDto {
    const dto = new GetArtistsResponseDto();
    dto.data = data.data.map((artist) => ArtistResponseDto.fromDomain(artist));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}
