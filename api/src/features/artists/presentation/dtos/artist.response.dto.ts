import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Artist, ArtistProps } from '../../domain/entities/artist.entity';

/**
 * Interface mínima para datos de artista (compatible con entity, props y use case outputs)
 */
interface ArtistDataInput {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  playCount?: number;
  mbzArtistId?: string;
  biography?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  externalUrl?: string;
  externalInfoUpdatedAt?: Date;
  orderArtistName?: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tipo unificado para datos de artista (entity o datos planos)
 */
type ArtistData = Artist | ArtistProps | ArtistDataInput;

/**
 * ArtistResponseDto - DTO de respuesta para UN artista
 */
export class ArtistResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
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

  @ApiProperty({ example: 1523, description: 'Total de reproducciones del artista' })
  @Expose()
  playCount!: number;

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
  size!: bigint;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  static fromDomain(data: ArtistData): ArtistResponseDto {
    // Extraer propiedades (funciona tanto con Artist entity como ArtistProps)
    const props = 'toPrimitives' in data ? data.toPrimitives() : data;

    const dto = new ArtistResponseDto();
    dto.id = props.id;
    dto.name = props.name;
    dto.albumCount = props.albumCount;
    dto.songCount = props.songCount;
    dto.playCount = props.playCount || 0;
    dto.mbzArtistId = props.mbzArtistId;
    dto.biography = props.biography;

    // Transform file paths to API URLs for frontend consumption with version for cache busting
    const hasAnyProfileImage = props.smallImageUrl || props.mediumImageUrl || props.largeImageUrl;

    // Add version parameter using externalInfoUpdatedAt if available (more accurate), fallback to updatedAt
    const timestamp = props.externalInfoUpdatedAt || props.updatedAt;
    const versionParam = timestamp ? `?v=${new Date(timestamp).getTime()}` : '';

    // V2 unified profile image (prioritizes: custom > large > medium > small)
    dto.profileImageUrl = hasAnyProfileImage ? `/api/images/artists/${props.id}/profile${versionParam}` : undefined;

    // Legacy fields (deprecated but kept for backwards compatibility)
    dto.smallImageUrl = hasAnyProfileImage ? `/api/images/artists/${props.id}/profile${versionParam}` : undefined;
    dto.mediumImageUrl = hasAnyProfileImage ? `/api/images/artists/${props.id}/profile${versionParam}` : undefined;
    dto.largeImageUrl = hasAnyProfileImage ? `/api/images/artists/${props.id}/profile${versionParam}` : undefined;

    dto.externalUrl = props.externalUrl;
    dto.externalInfoUpdatedAt = props.externalInfoUpdatedAt;
    dto.orderArtistName = props.orderArtistName;
    dto.size = BigInt(props.size);
    dto.createdAt = props.createdAt;
    dto.updatedAt = props.updatedAt;
    return dto;
  }
}
