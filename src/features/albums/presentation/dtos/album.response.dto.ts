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
  artistId?: string;

  @Expose()
  albumArtistId?: string;

  @Expose()
  coverArtPath?: string;

  @Expose()
  year?: number;

  @Expose()
  releaseDate?: Date;

  @Expose()
  compilation!: boolean;

  @Expose()
  songCount!: number;

  @Expose()
  duration!: number;

  @Expose()
  size!: bigint;

  @Expose()
  description?: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  static fromDomain(data: any): AlbumResponseDto {
    const dto = new AlbumResponseDto();
    dto.id = data.id;
    dto.name = data.name;
    dto.artistId = data.artistId;
    dto.albumArtistId = data.albumArtistId;
    dto.coverArtPath = data.coverArtPath;
    dto.year = data.year;
    dto.releaseDate = data.releaseDate;
    dto.compilation = data.compilation;
    dto.songCount = data.songCount;
    dto.duration = data.duration;
    dto.size = data.size;
    dto.description = data.description;
    dto.createdAt = data.createdAt;
    dto.updatedAt = data.updatedAt;
    return dto;
  }
}