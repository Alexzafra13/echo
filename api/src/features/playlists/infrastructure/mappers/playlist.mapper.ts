import { Playlist, PlaylistTrack } from '../../domain/entities';
import {
  Playlist as PlaylistDb,
  NewPlaylist,
  PlaylistTrack as PlaylistTrackDb,
  NewPlaylistTrack,
} from '@infrastructure/database/schema/playlists';

export class PlaylistMapper {
  static toDomain(raw: PlaylistDb): Playlist {
    return Playlist.fromPrimitives({
      id: raw.id,
      name: raw.name,
      description: raw.description ?? undefined,
      coverImageUrl: raw.coverImageUrl ?? undefined,
      duration: raw.duration,
      size: raw.size,
      ownerId: raw.ownerId,
      public: raw.public,
      songCount: raw.songCount,
      path: raw.path ?? undefined,
      sync: raw.sync,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toDomainArray(raws: PlaylistDb[]): Playlist[] {
    return raws.map((raw) => this.toDomain(raw));
  }

  static toPersistence(playlist: Playlist): NewPlaylist {
    const props = playlist.toPrimitives();
    return {
      id: props.id,
      name: props.name,
      description: props.description ?? null,
      coverImageUrl: props.coverImageUrl ?? null,
      duration: props.duration,
      size: Number(props.size || 0),
      ownerId: props.ownerId,
      public: props.public,
      songCount: props.songCount,
      path: props.path ?? null,
      sync: props.sync,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  static playlistTrackToDomain(raw: PlaylistTrackDb): PlaylistTrack {
    return PlaylistTrack.fromPrimitives({
      id: raw.id,
      playlistId: raw.playlistId,
      trackId: raw.trackId,
      trackOrder: raw.trackOrder,
      createdAt: raw.createdAt,
    });
  }

  static playlistTrackToPersistence(playlistTrack: PlaylistTrack): NewPlaylistTrack {
    const props = playlistTrack.toPrimitives();
    return {
      id: props.id,
      playlistId: props.playlistId,
      trackId: props.trackId,
      trackOrder: props.trackOrder,
      createdAt: props.createdAt,
    };
  }
}
