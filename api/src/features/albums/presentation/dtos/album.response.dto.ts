import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Album } from '../../domain/entities/album.entity';
import type { AlbumProps } from '../../domain/entities/album.entity';

/**
 * Tipo base para datos parciales de álbum (usado por queries que no traen todos los campos)
 */
interface PartialAlbumData {
  id: string;
  name: string;
  artistId?: string;
  artistName?: string;
  albumArtistId?: string;
  coverArtPath?: string;
  year?: number;
  releaseDate?: Date;
  compilation?: boolean;
  songCount: number;
  duration: number;
  size?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  externalInfoUpdatedAt?: Date;
}

/**
 * Tipo para datos de álbum que pueden venir de la entidad, AlbumProps, o una query parcial
 */
type AlbumData = Album | AlbumProps | PartialAlbumData;

/**
 * AlbumResponseDto - DTO de respuesta para UN álbum
 */
export class AlbumResponseDto {
  @Expose()
  @ApiProperty({ description: 'UUID del álbum', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Nombre del álbum', example: 'Abbey Road' })
  name!: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Alias del nombre (compatibilidad frontend)', example: 'Abbey Road' })
  title?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Nombre del artista', example: 'The Beatles' })
  artist?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'UUID del artista' })
  artistId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'UUID del artista del álbum' })
  albumArtistId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'URL de la portada' })
  coverArtPath?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Alias de la portada (compatibilidad frontend)' })
  coverImage?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Año de lanzamiento', example: 1969 })
  year?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Fecha de lanzamiento' })
  releaseDate?: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Es una compilación', example: false })
  compilation?: boolean;

  @Expose()
  @ApiProperty({ description: 'Número de canciones', example: 17 })
  songCount!: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Alias de songCount (compatibilidad frontend)', example: 17 })
  totalTracks?: number;

  @Expose()
  @ApiProperty({ description: 'Duración total en segundos', example: 2834 })
  duration!: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Tamaño en bytes' })
  size?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Descripción del álbum' })
  description?: string;

  @Expose()
  @ApiProperty({ description: 'Fecha de creación' })
  createdAt!: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Alias de createdAt (compatibilidad frontend)' })
  addedAt?: Date;

  @Expose()
  @ApiProperty({ description: 'Última actualización' })
  updatedAt!: Date;

  /**
   * Convierte una entidad de dominio Album a DTO de respuesta
   * @param data - Entidad Album o objeto con propiedades del álbum
   */
  static fromDomain(data: AlbumData): AlbumResponseDto {
    const dto = new AlbumResponseDto();
    dto.id = data.id;
    dto.name = data.name;
    dto.title = data.name; // Alias for frontend
    dto.artist = data.artistName || 'Unknown Artist'; // From aggregation
    dto.artistId = data.artistId;
    dto.albumArtistId = data.albumArtistId;

    // Generate cover URL with version parameter for cache busting
    // Use externalInfoUpdatedAt if available (more accurate), fallback to updatedAt
    let coverUrl = data.id ? `/api/images/albums/${data.id}/cover` : data.coverArtPath;

    if (data.id) {
      // Prefer externalInfoUpdatedAt (updates when cover changes) over updatedAt (updates on any change)
      const dataWithExternal = data as AlbumProps & { externalInfoUpdatedAt?: Date };
      const timestamp = dataWithExternal.externalInfoUpdatedAt || data.updatedAt;
      if (timestamp) {
        const version = new Date(timestamp).getTime();
        coverUrl = `/api/images/albums/${data.id}/cover?v=${version}`;
      }
    }

    dto.coverArtPath = coverUrl;
    dto.coverImage = coverUrl; // Alias for frontend compatibility
    dto.year = data.year;
    dto.releaseDate = data.releaseDate;
    dto.compilation = 'compilation' in data ? data.compilation : false;
    dto.songCount = data.songCount;
    dto.totalTracks = data.songCount; // Alias for frontend
    dto.duration = data.duration;
    dto.size = 'size' in data ? data.size : undefined;
    dto.description = data.description;
    dto.createdAt = data.createdAt;
    dto.addedAt = data.createdAt; // Alias for frontend
    dto.updatedAt = data.updatedAt;
    return dto;
  }
}