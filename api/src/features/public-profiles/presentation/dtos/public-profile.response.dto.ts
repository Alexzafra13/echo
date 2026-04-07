import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GetPublicProfileOutput,
  FriendshipStatus,
} from '../../domain/use-cases/get-public-profile';

class TopTrackDto {
  @ApiProperty({
    description: 'Unique track identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Track title', example: 'Bohemian Rhapsody' })
  @Expose()
  title!: string;

  @ApiPropertyOptional({ description: 'Name of the artist', example: 'Queen' })
  @Expose()
  artistName?: string;

  @ApiPropertyOptional({ description: 'Name of the album', example: 'A Night at the Opera' })
  @Expose()
  albumName?: string;

  @ApiPropertyOptional({
    description: 'Unique album identifier',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @Expose()
  albumId?: string;

  @ApiPropertyOptional({
    description: 'Unique artist identifier',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @Expose()
  artistId?: string;

  @ApiProperty({ description: 'Number of times this track has been played', example: 42 })
  @Expose()
  playCount!: number;

  @ApiPropertyOptional({
    description: 'URL to the album cover image',
    example: '/api/albums/b2c3d4e5/cover',
  })
  @Expose()
  coverUrl?: string;
}

class TopArtistDto {
  @ApiProperty({
    description: 'Unique artist identifier',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Artist name', example: 'Queen' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({
    description: 'URL to the artist profile image',
    example: '/api/images/artists/c3d4e5f6/profile',
  })
  @Expose()
  imageUrl?: string;

  @ApiProperty({ description: 'Number of times this artist has been played', example: 256 })
  @Expose()
  playCount!: number;
}

class TopAlbumDto {
  @ApiProperty({
    description: 'Unique album identifier',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Album name', example: 'A Night at the Opera' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ description: 'Name of the album artist', example: 'Queen' })
  @Expose()
  artistName?: string;

  @ApiPropertyOptional({
    description: 'Unique artist identifier',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @Expose()
  artistId?: string;

  @ApiPropertyOptional({
    description: 'URL to the album cover image',
    example: '/api/albums/b2c3d4e5/cover',
  })
  @Expose()
  coverUrl?: string;

  @ApiProperty({ description: 'Number of times this album has been played', example: 128 })
  @Expose()
  playCount!: number;

  @ApiPropertyOptional({ description: 'Release year of the album', example: 1975 })
  @Expose()
  year?: number;
}

class PublicPlaylistDto {
  @ApiProperty({
    description: 'Unique playlist identifier',
    example: 'd4e5f6a7-b8c9-0123-def0-123456789abc',
  })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Playlist name', example: 'My Favorite Songs' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({
    description: 'Playlist description',
    example: 'A collection of my all-time favorites',
  })
  @Expose()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the playlist cover image',
    example: '/api/playlists/d4e5f6a7/cover',
  })
  @Expose()
  coverUrl?: string;

  @ApiProperty({ description: 'Number of songs in the playlist', example: 25 })
  @Expose()
  songCount!: number;

  @ApiProperty({ description: 'Total playlist duration in seconds', example: 5400 })
  @Expose()
  duration!: number;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the playlist was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt!: string;

  @ApiProperty({
    description: 'List of album IDs referenced in this playlist',
    example: ['b2c3d4e5-f6a7-8901-bcde-f12345678901'],
    type: [String],
  })
  @Expose()
  albumIds!: string[];
}

class PublicUserDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'e5f6a7b8-c9d0-1234-ef01-23456789abcd',
  })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Username', example: 'musiclover42' })
  @Expose()
  username!: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'Jane Doe' })
  @Expose()
  name?: string;

  @ApiPropertyOptional({
    description: 'URL to the user avatar image',
    example: '/api/images/users/e5f6a7b8/avatar',
  })
  @Expose()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'Music enthusiast and vinyl collector',
  })
  @Expose()
  bio?: string;

  @ApiProperty({ description: 'Whether the user profile is public', example: true })
  @Expose()
  isPublicProfile!: boolean;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the user joined',
    example: '2023-06-01T00:00:00.000Z',
  })
  @Expose()
  memberSince!: string;
}

class PrivacySettingsDto {
  @ApiProperty({
    description: 'Whether top tracks are visible on the public profile',
    example: true,
  })
  @Expose()
  showTopTracks!: boolean;

  @ApiProperty({
    description: 'Whether top artists are visible on the public profile',
    example: true,
  })
  @Expose()
  showTopArtists!: boolean;

  @ApiProperty({
    description: 'Whether top albums are visible on the public profile',
    example: false,
  })
  @Expose()
  showTopAlbums!: boolean;

  @ApiProperty({
    description: 'Whether playlists are visible on the public profile',
    example: true,
  })
  @Expose()
  showPlaylists!: boolean;
}

class ProfileStatsDto {
  @ApiProperty({ description: 'Total number of plays across all tracks', example: 1520 })
  @Expose()
  totalPlays!: number;

  @ApiProperty({ description: 'Number of friends', example: 34 })
  @Expose()
  friendCount!: number;
}

class ListeningNowDto {
  @ApiProperty({
    description: 'ID of the currently playing track',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  trackId!: string;

  @ApiProperty({ description: 'Title of the currently playing track', example: 'Somebody to Love' })
  @Expose()
  trackTitle!: string;

  @ApiPropertyOptional({
    description: 'Artist name of the currently playing track',
    example: 'Queen',
  })
  @Expose()
  artistName?: string;

  @ApiPropertyOptional({
    description: 'Album ID of the currently playing track',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @Expose()
  albumId?: string;

  @ApiPropertyOptional({
    description: 'URL to the album cover of the currently playing track',
    example: '/api/albums/b2c3d4e5/cover',
  })
  @Expose()
  coverUrl?: string;
}

class SocialDto {
  @ApiProperty({
    description: 'Friendship status with the viewing user',
    example: 'friends',
    enum: ['none', 'pending', 'friends', 'blocked'],
  })
  @Expose()
  friendshipStatus!: FriendshipStatus;

  @ApiPropertyOptional({
    description: 'Friendship record ID if a friendship exists',
    example: 'f6a7b8c9-d0e1-2345-f012-3456789abcde',
  })
  @Expose()
  friendshipId?: string;

  @ApiProperty({ description: 'Profile statistics', type: () => ProfileStatsDto })
  @Expose()
  @Type(() => ProfileStatsDto)
  stats!: ProfileStatsDto;

  @ApiPropertyOptional({
    description: 'Currently playing track information',
    type: () => ListeningNowDto,
  })
  @Expose()
  @Type(() => ListeningNowDto)
  listeningNow?: ListeningNowDto;
}

export class PublicProfileResponseDto {
  @ApiProperty({ description: 'Public user information', type: () => PublicUserDto })
  @Expose()
  @Type(() => PublicUserDto)
  user!: PublicUserDto;

  @ApiPropertyOptional({ description: 'Top tracks for this user', type: () => [TopTrackDto] })
  @Expose()
  @Type(() => TopTrackDto)
  topTracks?: TopTrackDto[];

  @ApiPropertyOptional({ description: 'Top artists for this user', type: () => [TopArtistDto] })
  @Expose()
  @Type(() => TopArtistDto)
  topArtists?: TopArtistDto[];

  @ApiPropertyOptional({ description: 'Top albums for this user', type: () => [TopAlbumDto] })
  @Expose()
  @Type(() => TopAlbumDto)
  topAlbums?: TopAlbumDto[];

  @ApiPropertyOptional({
    description: 'Public playlists for this user',
    type: () => [PublicPlaylistDto],
  })
  @Expose()
  @Type(() => PublicPlaylistDto)
  playlists?: PublicPlaylistDto[];

  @ApiProperty({
    description: 'Privacy settings controlling profile visibility',
    type: () => PrivacySettingsDto,
  })
  @Expose()
  @Type(() => PrivacySettingsDto)
  settings!: PrivacySettingsDto;

  @ApiProperty({
    description: 'Social information including friendship status and stats',
    type: () => SocialDto,
  })
  @Expose()
  @Type(() => SocialDto)
  social!: SocialDto;

  static fromDomain(data: GetPublicProfileOutput): PublicProfileResponseDto {
    const dto = new PublicProfileResponseDto();

    dto.user = {
      id: data.user.id,
      username: data.user.username,
      name: data.user.name,
      avatarUrl: data.user.hasAvatar
        ? `/api/images/users/${data.user.id}/avatar${data.user.avatarUpdatedAt ? `?v=${data.user.avatarUpdatedAt.getTime()}` : ''}`
        : undefined,
      bio: data.user.bio,
      isPublicProfile: data.user.isPublicProfile,
      memberSince: data.user.createdAt.toISOString(),
    };

    dto.settings = data.settings;

    // Social data
    dto.social = {
      friendshipStatus: data.social.friendshipStatus,
      friendshipId: data.social.friendshipId,
      stats: data.social.stats,
      listeningNow: data.social.listeningNow
        ? {
            trackId: data.social.listeningNow.trackId,
            trackTitle: data.social.listeningNow.trackTitle,
            artistName: data.social.listeningNow.artistName,
            albumId: data.social.listeningNow.albumId,
            coverUrl: data.social.listeningNow.albumId
              ? `/api/albums/${data.social.listeningNow.albumId}/cover`
              : undefined,
          }
        : undefined,
    };

    if (data.topTracks) {
      dto.topTracks = data.topTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artistName: t.artistName,
        albumName: t.albumName,
        albumId: t.albumId,
        artistId: t.artistId,
        playCount: t.playCount,
        coverUrl: t.albumId ? `/api/albums/${t.albumId}/cover` : undefined,
      }));
    }

    if (data.topArtists) {
      dto.topArtists = data.topArtists.map((a) => ({
        id: a.id,
        name: a.name,
        // Generate URL if artist has any profile image (local or external/Fanart)
        imageUrl:
          a.profileImagePath || a.externalProfilePath
            ? `/api/images/artists/${a.id}/profile`
            : undefined,
        playCount: a.playCount,
      }));
    }

    if (data.topAlbums) {
      dto.topAlbums = data.topAlbums.map((a) => ({
        id: a.id,
        name: a.name,
        artistName: a.artistName,
        artistId: a.artistId,
        coverUrl: `/api/albums/${a.id}/cover`,
        playCount: a.playCount,
        year: a.year,
      }));
    }

    if (data.playlists) {
      dto.playlists = data.playlists.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        coverUrl: p.coverImageUrl,
        songCount: p.songCount,
        duration: p.duration,
        createdAt: p.createdAt.toISOString(),
        albumIds: p.albumIds,
      }));
    }

    return dto;
  }
}
