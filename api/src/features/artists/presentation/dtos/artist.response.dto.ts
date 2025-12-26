import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Artist } from '../../domain/entities/artist.entity';
import type { ArtistProps } from '../../domain/entities/artist.entity';

/**
 * Tipo para datos de artista que pueden venir de la entidad o de una query
 */
type ArtistData = Artist | ArtistProps;

/**
 * ArtistResponseDto - DTO de respuesta para UN artista
 */
export class ArtistResponseDto {
  @ApiProperty({ description: 'UUID del artista', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'The Beatles' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 13, description: 'Número de álbumes del artista' })
  @Expose()
  albumCount!: number;

  @ApiProperty({ example: 213, description: 'Número de canciones del artista' })
  @Expose()
  songCount!: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  mbzArtistId?: string;

  @ApiProperty({ required: false })
  @Expose()
  biography?: string;

  @ApiProperty({ required: false, description: 'V2 unified profile image URL' })
  @Expose()
  profileImageUrl?: string;

  @ApiProperty({ required: false, deprecated: true, description: 'Legacy: use profileImageUrl instead' })
  @Expose()
  smallImageUrl?: string;

  @ApiProperty({ required: false, deprecated: true, description: 'Legacy: use profileImageUrl instead' })
  @Expose()
  mediumImageUrl?: string;

  @ApiProperty({ required: false, deprecated: true, description: 'Legacy: use profileImageUrl instead' })
  @Expose()
  largeImageUrl?: string;

  @ApiProperty({ required: false })
  @Expose()
  externalUrl?: string;

  @ApiProperty({ required: false })
  @Expose()
  externalInfoUpdatedAt?: Date;

  @ApiProperty({ required: false })
  @Expose()
  orderArtistName?: string;

  @ApiProperty({ example: 1073741824, description: 'Tamaño total en bytes' })
  @Expose()
  size!: number;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  /**
   * Convierte una entidad de dominio Artist a DTO de respuesta
   * @param data - Entidad Artist o objeto con propiedades del artista
   */
  static fromDomain(data: ArtistData): ArtistResponseDto {
    const dto = new ArtistResponseDto();
    dto.id = data.id;
    dto.name = data.name;
    dto.albumCount = data.albumCount;
    dto.songCount = data.songCount;
    dto.mbzArtistId = data.mbzArtistId;
    dto.biography = data.biography;

    // Transform file paths to API URLs for frontend consumption with version for cache busting
    const hasAnyProfileImage = data.smallImageUrl || data.mediumImageUrl || data.largeImageUrl;

    // Add version parameter using externalInfoUpdatedAt if available (more accurate), fallback to updatedAt
    const timestamp = data.externalInfoUpdatedAt || data.updatedAt;
    const versionParam = timestamp ? `?v=${new Date(timestamp).getTime()}` : '';

    // V2 unified profile image (prioritizes: custom > large > medium > small)
    dto.profileImageUrl = hasAnyProfileImage ? `/api/images/artists/${data.id}/profile${versionParam}` : undefined;

    // Legacy fields (deprecated but kept for backwards compatibility)
    dto.smallImageUrl = hasAnyProfileImage ? `/api/images/artists/${data.id}/profile${versionParam}` : undefined;
    dto.mediumImageUrl = hasAnyProfileImage ? `/api/images/artists/${data.id}/profile${versionParam}` : undefined;
    dto.largeImageUrl = hasAnyProfileImage ? `/api/images/artists/${data.id}/profile${versionParam}` : undefined;

    dto.externalUrl = data.externalUrl;
    dto.externalInfoUpdatedAt = data.externalInfoUpdatedAt;
    dto.orderArtistName = data.orderArtistName;
    dto.size = data.size;
    dto.createdAt = data.createdAt;
    dto.updatedAt = data.updatedAt;
    return dto;
  }
}
