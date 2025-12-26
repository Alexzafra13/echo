import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RelatedArtistDto - DTO para un artista relacionado
 */
export class RelatedArtistDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del artista' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Artist Name', description: 'Nombre del artista' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 5, description: 'Número de álbumes' })
  @Expose()
  albumCount!: number;

  @ApiProperty({ example: 45, description: 'Número de canciones' })
  @Expose()
  songCount!: number;

  @ApiProperty({ example: 85, description: 'Puntuación de coincidencia (0-100)' })
  @Expose()
  matchScore!: number;
}

/**
 * GetRelatedArtistsResponseDto - DTO de respuesta para artistas relacionados
 */
export class GetRelatedArtistsResponseDto {
  @ApiProperty({ type: [RelatedArtistDto], description: 'Artistas relacionados' })
  @Expose()
  data!: RelatedArtistDto[];

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del artista base' })
  @Expose()
  artistId!: string;

  @ApiProperty({ example: 10, description: 'Límite de artistas solicitados' })
  @Expose()
  limit!: number;

  @ApiProperty({
    example: 'lastfm',
    description: 'Fuente de los datos (lastfm, internal, none)',
    enum: ['lastfm', 'internal', 'none']
  })
  @Expose()
  source!: 'lastfm' | 'internal' | 'none';

  static create(params: {
    data: RelatedArtistDto[];
    artistId: string;
    limit: number;
    source: 'lastfm' | 'internal' | 'none';
  }): GetRelatedArtistsResponseDto {
    const dto = new GetRelatedArtistsResponseDto();
    dto.data = params.data;
    dto.artistId = params.artistId;
    dto.limit = params.limit;
    dto.source = params.source;
    return dto;
  }
}
