import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TrackResponseDto - DTO de respuesta para UN track
 */
export class TrackResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Come Together' })
  @Expose()
  title!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', required: false })
  @Expose()
  albumId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002', required: false })
  @Expose()
  artistId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003', required: false })
  @Expose()
  albumArtistId?: string;

  @ApiProperty({ example: 1, required: false })
  @Expose()
  trackNumber?: number;

  @ApiProperty({ example: 1 })
  @Expose()
  discNumber!: number;

  @ApiProperty({ example: 1969, required: false })
  @Expose()
  year?: number;

  @ApiProperty({ example: 259, description: 'Duration in seconds', required: false })
  @Expose()
  duration?: number;

  @ApiProperty({ example: '/music/beatles/abbey-road/01-come-together.mp3' })
  @Expose()
  path!: string;

  @ApiProperty({ example: 320000, description: 'Bit rate in bps', required: false })
  @Expose()
  bitRate?: number;

  @ApiProperty({ example: 10485760, description: 'File size in bytes', required: false })
  @Expose()
  size?: number;

  @ApiProperty({ example: 'mp3', required: false })
  @Expose()
  suffix?: string;

  @ApiProperty({ required: false })
  @Expose()
  lyrics?: string;

  @ApiProperty({ required: false })
  @Expose()
  comment?: string;

  @ApiProperty({ example: 'Abbey Road', required: false })
  @Expose()
  albumName?: string;

  @ApiProperty({ example: 'The Beatles', required: false })
  @Expose()
  artistName?: string;

  @ApiProperty({ example: 'The Beatles', required: false })
  @Expose()
  albumArtistName?: string;

  @ApiProperty({ example: false })
  @Expose()
  compilation!: boolean;

  @ApiProperty({ example: -3.5, description: 'ReplayGain track gain in dB', required: false })
  @Expose()
  rgTrackGain?: number;

  @ApiProperty({ example: 0.95, description: 'ReplayGain track peak (0-1)', required: false })
  @Expose()
  rgTrackPeak?: number;

  @ApiProperty({ example: -4.2, description: 'ReplayGain album gain in dB', required: false })
  @Expose()
  rgAlbumGain?: number;

  @ApiProperty({ example: 0.98, description: 'ReplayGain album peak (0-1)', required: false })
  @Expose()
  rgAlbumPeak?: number;

  @ApiProperty({ example: false, description: 'Whether the file is missing from disk' })
  @Expose()
  isMissing!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  static fromDomain(track: any): TrackResponseDto {
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
