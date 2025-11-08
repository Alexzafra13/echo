import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GetPlaylistOutput,
  GetPlaylistsOutput,
  PlaylistListItem,
} from '../../domain/use-cases';

export class PlaylistResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Mi Playlist Favorita' })
  name!: string;

  @ApiPropertyOptional({ example: 'Mis canciones favoritas de rock' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  coverImageUrl?: string;

  @ApiProperty({ example: 3600, description: 'Duración total en segundos' })
  duration!: number;

  @ApiProperty({ example: '1048576', description: 'Tamaño total en bytes (como string)' })
  size!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  ownerId!: string;

  @ApiProperty({ example: false })
  public!: boolean;

  @ApiProperty({ example: 10 })
  songCount!: number;

  @ApiPropertyOptional({ type: [String], example: ['album-id-1', 'album-id-2'], description: 'Unique album IDs in the playlist' })
  albumIds?: string[];

  @ApiPropertyOptional({ example: '/music/playlists/my-playlist' })
  path?: string;

  @ApiProperty({ example: false })
  sync!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(output: GetPlaylistOutput): PlaylistResponseDto {
    return {
      id: output.id,
      name: output.name,
      description: output.description,
      coverImageUrl: output.coverImageUrl,
      duration: output.duration,
      size: output.size.toString(),
      ownerId: output.ownerId,
      public: output.public,
      songCount: output.songCount,
      path: output.path,
      sync: output.sync,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }

  static fromListItem(item: PlaylistListItem): PlaylistResponseDto {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      coverImageUrl: item.coverImageUrl,
      duration: item.duration,
      size: item.size.toString(),
      ownerId: item.ownerId,
      public: item.public,
      songCount: item.songCount,
      albumIds: item.albumIds,
      path: undefined,
      sync: false,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export class PlaylistsListResponseDto {
  @ApiProperty({ type: [PlaylistResponseDto] })
  items!: PlaylistResponseDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 0 })
  skip!: number;

  @ApiProperty({ example: 20 })
  take!: number;

  static fromDomain(output: GetPlaylistsOutput): PlaylistsListResponseDto {
    return {
      items: output.items.map((item) => PlaylistResponseDto.fromListItem(item)),
      total: output.total,
      skip: output.skip,
      take: output.take,
    };
  }
}
