import { Expose } from 'class-transformer';
import { Album, AlbumProps } from '../../domain/entities/album.entity';

/**
 * Interface mínima para datos de álbum (compatible con entity, props y use case outputs)
 */
interface AlbumDataInput {
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
}

/**
 * Tipo unificado para datos de álbum (entity o datos planos)
 */
type AlbumData = Album | AlbumProps | AlbumDataInput;

/**
 * AlbumResponseDto - DTO de respuesta para UN álbum
 */
export class AlbumResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  title?: string; // Alias for frontend compatibility

  @Expose()
  artist?: string; // Artist name for frontend

  @Expose()
  artistId?: string;

  @Expose()
  albumArtistId?: string;

  @Expose()
  coverArtPath?: string;

  @Expose()
  coverImage?: string; // Alias for frontend compatibility

  @Expose()
  year?: number;

  @Expose()
  releaseDate?: Date;

  @Expose()
  compilation!: boolean;

  @Expose()
  songCount!: number;

  @Expose()
  totalTracks?: number; // Alias for frontend compatibility

  @Expose()
  duration!: number;

  @Expose()
  size!: bigint;

  @Expose()
  description?: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  addedAt?: Date; // Alias for frontend compatibility

  @Expose()
  updatedAt!: Date;

  static fromDomain(data: AlbumData): AlbumResponseDto {
    // Extraer propiedades (funciona tanto con Album entity como AlbumOutput)
    const props = 'toPrimitives' in data ? data.toPrimitives() : data;

    const dto = new AlbumResponseDto();
    dto.id = props.id;
    dto.name = props.name;
    dto.title = props.name; // Alias for frontend
    dto.artist = props.artistName || 'Unknown Artist'; // From aggregation
    dto.artistId = props.artistId;
    dto.albumArtistId = props.albumArtistId;

    // Generate cover URL with version parameter for cache busting
    let coverUrl = props.id ? `/api/images/albums/${props.id}/cover` : props.coverArtPath;

    if (props.id && props.updatedAt) {
      const version = new Date(props.updatedAt).getTime();
      coverUrl = `/api/images/albums/${props.id}/cover?v=${version}`;
    }

    dto.coverArtPath = coverUrl;
    dto.coverImage = coverUrl; // Alias for frontend compatibility
    dto.year = props.year;
    dto.releaseDate = props.releaseDate;
    dto.compilation = props.compilation ?? false;
    dto.songCount = props.songCount;
    dto.totalTracks = props.songCount; // Alias for frontend
    dto.duration = props.duration;
    dto.size = BigInt(props.size ?? 0);
    dto.description = props.description;
    dto.createdAt = props.createdAt;
    dto.addedAt = props.createdAt; // Alias for frontend
    dto.updatedAt = props.updatedAt;
    return dto;
  }
}