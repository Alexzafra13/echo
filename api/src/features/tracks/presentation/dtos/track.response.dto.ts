import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Track, TrackProps } from '../../domain/entities/track.entity';

/**
 * Tipo para datos de track que pueden venir de la entidad o de una query
 */
type TrackData = Track | TrackProps;

/**
 * TrackResponseDto - DTO de respuesta para UN track
 */
export class TrackResponseDto {
  @ApiProperty({ description: 'UUID del track', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Título del track', example: 'Come Together' })
  @Expose()
  title!: string;

  @ApiPropertyOptional({ description: 'UUID del álbum', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  albumId?: string;

  @ApiPropertyOptional({ description: 'UUID del artista', example: '123e4567-e89b-12d3-a456-426614174002' })
  @Expose()
  artistId?: string;

  @ApiPropertyOptional({ description: 'UUID del artista del álbum', example: '123e4567-e89b-12d3-a456-426614174003' })
  @Expose()
  albumArtistId?: string;

  @ApiPropertyOptional({ description: 'Número de pista', example: 1 })
  @Expose()
  trackNumber?: number;

  @ApiProperty({ description: 'Número de disco', example: 1 })
  @Expose()
  discNumber!: number;

  @ApiPropertyOptional({ description: 'Año de lanzamiento', example: 1969 })
  @Expose()
  year?: number;

  @ApiPropertyOptional({ description: 'Duración en segundos', example: 259 })
  @Expose()
  duration?: number;

  @ApiProperty({ description: 'Ruta del archivo', example: '/music/beatles/abbey-road/01-come-together.mp3' })
  @Expose()
  path!: string;

  @ApiPropertyOptional({ description: 'Bit rate en bps', example: 320000 })
  @Expose()
  bitRate?: number;

  @ApiPropertyOptional({ description: 'Tamaño en bytes', example: 10485760 })
  @Expose()
  size?: number;

  @ApiPropertyOptional({ description: 'Extensión del archivo', example: 'mp3' })
  @Expose()
  suffix?: string;

  @ApiPropertyOptional({ description: 'Letra de la canción' })
  @Expose()
  lyrics?: string;

  @ApiPropertyOptional({ description: 'Comentario' })
  @Expose()
  comment?: string;

  @ApiPropertyOptional({ description: 'Nombre del álbum', example: 'Abbey Road' })
  @Expose()
  albumName?: string;

  @ApiPropertyOptional({ description: 'Nombre del artista', example: 'The Beatles' })
  @Expose()
  artistName?: string;

  @ApiPropertyOptional({ description: 'Nombre del artista del álbum', example: 'The Beatles' })
  @Expose()
  albumArtistName?: string;

  @ApiProperty({ description: 'Es compilación', example: false })
  @Expose()
  compilation!: boolean;

  @ApiPropertyOptional({ description: 'ReplayGain track gain en dB', example: -3.5 })
  @Expose()
  rgTrackGain?: number;

  @ApiPropertyOptional({ description: 'ReplayGain track peak (0-1)', example: 0.95 })
  @Expose()
  rgTrackPeak?: number;

  @ApiPropertyOptional({ description: 'ReplayGain album gain en dB', example: -4.2 })
  @Expose()
  rgAlbumGain?: number;

  @ApiPropertyOptional({ description: 'ReplayGain album peak (0-1)', example: 0.98 })
  @Expose()
  rgAlbumPeak?: number;

  @ApiProperty({ description: 'Archivo falta en disco', example: false })
  @Expose()
  isMissing!: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Última actualización' })
  @Expose()
  updatedAt!: Date;

  /**
   * Convierte una entidad de dominio Track a DTO de respuesta
   * @param track - Entidad Track o objeto con propiedades del track
   */
  static fromDomain(track: TrackData): TrackResponseDto {
    // Convert to primitives if it's a Track entity (has toPrimitives method)
    const data = track.toPrimitives ? track.toPrimitives() : track;

    const dto = new TrackResponseDto();
    dto.id = data.id;
    dto.title = data.title;
    dto.albumId = data.albumId;
    dto.artistId = data.artistId;
    dto.albumArtistId = data.albumArtistId;
    dto.trackNumber = data.trackNumber;
    dto.discNumber = data.discNumber;
    dto.year = data.year;
    dto.duration = data.duration;
    dto.path = data.path;
    dto.bitRate = data.bitRate;
    dto.size = data.size; // Now correctly a number from toPrimitives()
    dto.suffix = data.suffix;
    dto.lyrics = data.lyrics;
    dto.comment = data.comment;
    dto.albumName = data.albumName;
    dto.artistName = data.artistName;
    dto.albumArtistName = data.albumArtistName;
    dto.compilation = data.compilation;
    // ReplayGain / Normalización
    dto.rgTrackGain = data.rgTrackGain;
    dto.rgTrackPeak = data.rgTrackPeak;
    dto.rgAlbumGain = data.rgAlbumGain;
    dto.rgAlbumPeak = data.rgAlbumPeak;
    // Missing file status
    dto.isMissing = data.missingAt !== undefined && data.missingAt !== null;
    dto.createdAt = data.createdAt;
    dto.updatedAt = data.updatedAt;
    return dto;
  }
}
