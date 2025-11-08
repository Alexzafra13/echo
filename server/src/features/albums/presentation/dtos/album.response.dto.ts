import { Expose } from 'class-transformer';

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

  static fromDomain(data: any): AlbumResponseDto {
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
      const timestamp = data.externalInfoUpdatedAt || data.updatedAt;
      if (timestamp) {
        const version = new Date(timestamp).getTime();
        coverUrl = `/api/images/albums/${data.id}/cover?v=${version}`;
        // Debug logging
        console.log(`[AlbumDTO] Album: ${data.name}, externalInfoUpdatedAt: ${data.externalInfoUpdatedAt}, updatedAt: ${data.updatedAt}, version: ${version}, coverUrl: ${coverUrl}`);
      }
    }

    dto.coverArtPath = coverUrl;
    dto.coverImage = coverUrl; // Alias for frontend compatibility
    dto.year = data.year;
    dto.releaseDate = data.releaseDate;
    dto.compilation = data.compilation;
    dto.songCount = data.songCount;
    dto.totalTracks = data.songCount; // Alias for frontend
    dto.duration = data.duration;
    dto.size = data.size;
    dto.description = data.description;
    dto.createdAt = data.createdAt;
    dto.addedAt = data.createdAt; // Alias for frontend
    dto.updatedAt = data.updatedAt;
    return dto;
  }
}