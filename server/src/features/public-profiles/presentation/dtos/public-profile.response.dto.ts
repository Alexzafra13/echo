import { Expose, Type } from 'class-transformer';
import { GetPublicProfileOutput } from '../../domain/use-cases/get-public-profile';

class TopTrackDto {
  @Expose() id!: string;
  @Expose() title!: string;
  @Expose() artistName?: string;
  @Expose() albumName?: string;
  @Expose() albumId?: string;
  @Expose() artistId?: string;
  @Expose() playCount!: number;
  @Expose() coverUrl?: string;
}

class TopArtistDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() imageUrl?: string;
  @Expose() playCount!: number;
}

class TopAlbumDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() artistName?: string;
  @Expose() artistId?: string;
  @Expose() coverUrl?: string;
  @Expose() playCount!: number;
  @Expose() year?: number;
}

class PublicPlaylistDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() description?: string;
  @Expose() coverUrl?: string;
  @Expose() songCount!: number;
  @Expose() duration!: number;
  @Expose() createdAt!: string;
}

class PublicUserDto {
  @Expose() id!: string;
  @Expose() username!: string;
  @Expose() name?: string;
  @Expose() avatarUrl?: string;
  @Expose() bio?: string;
  @Expose() isPublicProfile!: boolean;
  @Expose() memberSince!: string;
}

class PrivacySettingsDto {
  @Expose() showTopTracks!: boolean;
  @Expose() showTopArtists!: boolean;
  @Expose() showTopAlbums!: boolean;
  @Expose() showPlaylists!: boolean;
}

export class PublicProfileResponseDto {
  @Expose()
  @Type(() => PublicUserDto)
  user!: PublicUserDto;

  @Expose()
  @Type(() => TopTrackDto)
  topTracks?: TopTrackDto[];

  @Expose()
  @Type(() => TopArtistDto)
  topArtists?: TopArtistDto[];

  @Expose()
  @Type(() => TopAlbumDto)
  topAlbums?: TopAlbumDto[];

  @Expose()
  @Type(() => PublicPlaylistDto)
  playlists?: PublicPlaylistDto[];

  @Expose()
  @Type(() => PrivacySettingsDto)
  settings!: PrivacySettingsDto;

  static fromDomain(data: GetPublicProfileOutput): PublicProfileResponseDto {
    const dto = new PublicProfileResponseDto();

    dto.user = {
      id: data.user.id,
      username: data.user.username,
      name: data.user.name,
      avatarUrl: data.user.hasAvatar ? `/api/images/users/${data.user.id}/avatar` : undefined,
      bio: data.user.bio,
      isPublicProfile: data.user.isPublicProfile,
      memberSince: data.user.createdAt.toISOString(),
    };

    dto.settings = data.settings;

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
        imageUrl: a.profileImagePath ? `/api/images/artists/${a.id}/profile` : undefined,
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
      }));
    }

    return dto;
  }
}
