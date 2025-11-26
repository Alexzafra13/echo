import { Playlist as PrismaPlaylist, PlaylistTrack as PrismaPlaylistTrack } from '../../../../generated/prisma';
import { Playlist, PlaylistTrack } from '../../domain/entities';

export class PlaylistMapper {
  static toDomain(raw: PrismaPlaylist): Playlist {
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

  static toDomainArray(raws: PrismaPlaylist[]): Playlist[] {
    return raws.map((raw) => this.toDomain(raw));
  }

  static toPrisma(playlist: Playlist): PrismaPlaylist {
    const props = playlist.toPrimitives();
    return {
      id: props.id,
      name: props.name,
      description: props.description ?? null,
      coverImageUrl: props.coverImageUrl ?? null,
      duration: props.duration,
      size: props.size,
      ownerId: props.ownerId,
      public: props.public,
      songCount: props.songCount,
      path: props.path ?? null,
      sync: props.sync,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  static playlistTrackToDomain(raw: PrismaPlaylistTrack): PlaylistTrack {
    return PlaylistTrack.fromPrimitives({
      id: raw.id,
      playlistId: raw.playlistId,
      trackId: raw.trackId,
      trackOrder: raw.trackOrder,
      createdAt: raw.createdAt,
    });
  }

  static playlistTrackToPrisma(playlistTrack: PlaylistTrack): PrismaPlaylistTrack {
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
