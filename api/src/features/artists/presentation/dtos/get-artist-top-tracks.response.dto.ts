import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TopTrackDto - DTO para un track en el top de un artista
 */
export class TopTrackDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del track' })
  @Expose()
  trackId!: string;

  @ApiProperty({ example: 'Song Title', description: 'Título del track' })
  @Expose()
  title!: string;

  @ApiProperty({ example: 150, description: 'Número total de reproducciones' })
  @Expose()
  playCount!: number;
}

/**
 * GetArtistTopTracksResponseDto - DTO de respuesta para top tracks de un artista
 */
export class GetArtistTopTracksResponseDto {
  @ApiProperty({ type: [TopTrackDto], description: 'Top tracks del artista' })
  @Expose()
  data!: TopTrackDto[];

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del artista' })
  @Expose()
  artistId!: string;

  @ApiProperty({ example: 10, description: 'Límite de tracks solicitados' })
  @Expose()
  limit!: number;

  @ApiProperty({ example: 30, description: 'Filtro de días (opcional)', required: false })
  @Expose()
  days?: number;

  static create(params: {
    data: TopTrackDto[];
    artistId: string;
    limit: number;
    days?: number;
  }): GetArtistTopTracksResponseDto {
    const dto = new GetArtistTopTracksResponseDto();
    dto.data = params.data;
    dto.artistId = params.artistId;
    dto.limit = params.limit;
    dto.days = params.days;
    return dto;
  }
}
