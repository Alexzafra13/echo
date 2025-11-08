import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GetPlaylistTracksOutput, TrackItem } from '../../domain/use-cases';

export class PlaylistTrackResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Bohemian Rhapsody' })
  title!: string;

  @ApiPropertyOptional({ example: 1 })
  trackNumber?: number;

  @ApiProperty({ example: 1 })
  discNumber!: number;

  @ApiPropertyOptional({ example: 1975 })
  year?: number;

  @ApiProperty({ example: 354, description: 'Duración en segundos' })
  duration!: number;

  @ApiProperty({ example: '5242880', description: 'Tamaño en bytes (como string)' })
  size!: string;

  @ApiProperty({ example: '/music/Queen/A Night at the Opera/01 Bohemian Rhapsody.mp3' })
  path!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  albumId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  artistId?: string;

  @ApiPropertyOptional({ example: 320 })
  bitRate?: number;

  @ApiPropertyOptional({ example: 'mp3' })
  suffix?: string;

  @ApiPropertyOptional({ example: 'Queen' })
  artistName?: string;

  @ApiPropertyOptional({ example: 'A Night at the Opera' })
  albumName?: string;

  @ApiPropertyOptional({ example: 1, description: 'Orden en la playlist' })
  playlistOrder?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;

  static fromTrackItem(item: TrackItem): PlaylistTrackResponseDto {
    return {
      id: item.id,
      title: item.title,
      trackNumber: item.trackNumber,
      discNumber: item.discNumber,
      year: item.year,
      duration: item.duration,
      size: item.size.toString(),
      path: item.path,
      albumId: item.albumId,
      artistId: item.artistId,
      bitRate: item.bitRate,
      suffix: item.suffix,
      artistName: item.artistName,
      albumName: item.albumName,
      playlistOrder: item.playlistOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export class PlaylistTracksResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  playlistId!: string;

  @ApiProperty({ example: 'Mi Playlist Favorita' })
  playlistName!: string;

  @ApiProperty({ type: [PlaylistTrackResponseDto] })
  tracks!: PlaylistTrackResponseDto[];

  @ApiProperty({ example: 10 })
  total!: number;

  static fromDomain(output: GetPlaylistTracksOutput): PlaylistTracksResponseDto {
    return {
      playlistId: output.playlistId,
      playlistName: output.playlistName,
      tracks: output.tracks.map((track) => PlaylistTrackResponseDto.fromTrackItem(track)),
      total: output.total,
    };
  }
}
