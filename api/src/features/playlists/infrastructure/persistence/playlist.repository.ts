import { Injectable } from '@nestjs/common';
import { eq, desc, and, or, count, sql, inArray, asc, max } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { createSearchPattern } from '@shared/utils';
import {
  playlists,
  playlistTracks,
  tracks,
  albums,
  artists,
} from '@infrastructure/database/schema';
import { IPlaylistRepository, TrackWithPlaylistOrder } from '../../domain/ports';
import { Playlist, PlaylistTrack, PlaylistProps } from '../../domain/entities';
import { PlaylistMapper } from '../mappers/playlist.mapper';
import { TrackMapper } from '@features/tracks/infrastructure/persistence/track.mapper';

@Injectable()
export class DrizzlePlaylistRepository implements IPlaylistRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  // Playlist CRUD
  async findById(id: string): Promise<Playlist | null> {
    const result = await this.drizzle.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return PlaylistMapper.toDomain(result[0]);
  }

  async findByOwnerId(ownerId: string, skip: number, take: number): Promise<Playlist[]> {
    const result = await this.drizzle.db
      .select()
      .from(playlists)
      .where(eq(playlists.ownerId, ownerId))
      .orderBy(desc(playlists.createdAt))
      .offset(skip)
      .limit(take);

    return PlaylistMapper.toDomainArray(result);
  }

  async findPublic(skip: number, take: number): Promise<Playlist[]> {
    const result = await this.drizzle.db
      .select()
      .from(playlists)
      .where(eq(playlists.public, true))
      .orderBy(desc(playlists.createdAt))
      .offset(skip)
      .limit(take);

    return PlaylistMapper.toDomainArray(result);
  }

  async search(name: string, skip: number, take: number): Promise<Playlist[]> {
    // Use ILIKE for case-insensitive search with escaped wildcards
    const searchPattern = createSearchPattern(name);

    const result = await this.drizzle.db
      .select()
      .from(playlists)
      .where(sql`${playlists.name} ILIKE ${searchPattern}`)
      .orderBy(playlists.name)
      .offset(skip)
      .limit(take);

    return PlaylistMapper.toDomainArray(result);
  }

  async count(): Promise<number> {
    const result = await this.drizzle.db.select({ count: count() }).from(playlists);

    return result[0]?.count ?? 0;
  }

  async countByOwnerId(ownerId: string): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(playlists)
      .where(eq(playlists.ownerId, ownerId));

    return result[0]?.count ?? 0;
  }

  async create(playlist: Playlist): Promise<Playlist> {
    const data = PlaylistMapper.toPersistence(playlist);

    const result = await this.drizzle.db
      .insert(playlists)
      .values({
        id: data.id,
        name: data.name,
        description: data.description,
        coverImageUrl: data.coverImageUrl,
        duration: data.duration,
        size: data.size,
        ownerId: data.ownerId,
        public: data.public,
        songCount: data.songCount,
        path: data.path,
        sync: data.sync,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    return PlaylistMapper.toDomain(result[0]);
  }

  async update(
    id: string,
    playlist: Partial<Playlist> | Partial<PlaylistProps>
  ): Promise<Playlist | null> {
    // Handle both Playlist entity and plain props object
    const props: Partial<PlaylistProps> =
      'toPrimitives' in playlist && typeof playlist.toPrimitives === 'function'
        ? playlist.toPrimitives()
        : (playlist as Partial<PlaylistProps>);

    const result = await this.drizzle.db
      .update(playlists)
      .set({
        name: props.name,
        description: props.description,
        coverImageUrl: props.coverImageUrl,
        duration: props.duration,
        size: props.size,
        public: props.public,
        songCount: props.songCount,
        updatedAt: new Date(),
      })
      .where(eq(playlists.id, id))
      .returning();

    return result[0] ? PlaylistMapper.toDomain(result[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db.delete(playlists).where(eq(playlists.id, id)).returning();

    return result.length > 0;
  }

  // PlaylistTrack management
  async addTrack(playlistTrack: PlaylistTrack): Promise<PlaylistTrack> {
    const data = PlaylistMapper.playlistTrackToPersistence(playlistTrack);

    const result = await this.drizzle.db
      .insert(playlistTracks)
      .values({
        id: data.id,
        playlistId: data.playlistId,
        trackId: data.trackId,
        trackOrder: data.trackOrder,
        createdAt: data.createdAt,
      })
      .returning();

    return PlaylistMapper.playlistTrackToDomain(result[0]);
  }

  /**
   * RACE CONDITION FIX: Add track with auto-assigned order within a transaction
   */
  async addTrackWithAutoOrder(playlistId: string, trackId: string): Promise<PlaylistTrack> {
    // Use a transaction for atomicity
    return await this.drizzle.db.transaction(async (tx) => {
      // 1. Get maximum trackOrder
      const maxOrderResult = await tx
        .select({ maxOrder: max(playlistTracks.trackOrder) })
        .from(playlistTracks)
        .where(eq(playlistTracks.playlistId, playlistId));

      // 2. Calculate next order
      const nextOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

      // 3. Insert new track
      const result = await tx
        .insert(playlistTracks)
        .values({
          playlistId,
          trackId,
          trackOrder: nextOrder,
        })
        .returning();

      return PlaylistMapper.playlistTrackToDomain(result[0]);
    });
  }

  async removeTrack(playlistId: string, trackId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(playlistTracks)
      .where(and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, trackId)))
      .returning();

    return result.length > 0;
  }

  async getPlaylistTracks(playlistId: string): Promise<TrackWithPlaylistOrder[]> {
    const result = await this.drizzle.db
      .select({
        playlistTrack: playlistTracks,
        track: tracks,
        album: albums,
        artist: artists,
      })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .where(eq(playlistTracks.playlistId, playlistId))
      .orderBy(asc(playlistTracks.trackOrder));

    // Map tracks and attach playlistOrder (1-indexed for display)
    return result.map((r, index) => {
      const track = TrackMapper.toDomain(r.track);
      return Object.assign(track, { playlistOrder: index + 1 }) as TrackWithPlaylistOrder;
    });
  }

  async getPlaylistAlbumIds(playlistId: string): Promise<string[]> {
    const result = await this.drizzle.db
      .select({ albumId: tracks.albumId })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(eq(playlistTracks.playlistId, playlistId))
      .orderBy(asc(playlistTracks.trackOrder));

    // Get unique album IDs, filter out nulls
    const albumIds = result
      .map((r) => r.albumId)
      .filter((id): id is string => id !== null && id !== undefined);

    return Array.from(new Set(albumIds));
  }

  /**
   * OPTIMIZATION: Batch fetch album IDs for multiple playlists
   */
  async getBatchPlaylistAlbumIds(playlistIds: string[]): Promise<Map<string, string[]>> {
    if (playlistIds.length === 0) {
      return new Map();
    }

    const result = await this.drizzle.db
      .select({
        playlistId: playlistTracks.playlistId,
        albumId: tracks.albumId,
      })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(inArray(playlistTracks.playlistId, playlistIds))
      .orderBy(asc(playlistTracks.trackOrder));

    // Group tracks by playlist
    const tracksByPlaylist = new Map<string, string[]>();

    for (const r of result) {
      if (!r.albumId) continue;

      if (!tracksByPlaylist.has(r.playlistId)) {
        tracksByPlaylist.set(r.playlistId, []);
      }

      tracksByPlaylist.get(r.playlistId)!.push(r.albumId);
    }

    // Get unique album IDs per playlist
    const resultMap = new Map<string, string[]>();
    for (const [playlistId, albumIds] of tracksByPlaylist.entries()) {
      resultMap.set(playlistId, Array.from(new Set(albumIds)));
    }

    // Ensure all requested playlists have an entry (even if empty)
    for (const playlistId of playlistIds) {
      if (!resultMap.has(playlistId)) {
        resultMap.set(playlistId, []);
      }
    }

    return resultMap;
  }

  async reorderTracks(
    playlistId: string,
    trackOrders: Array<{ trackId: string; order: number }>
  ): Promise<boolean> {
    if (trackOrders.length === 0) {
      return true;
    }

    // Use transaction with two-step update to avoid unique constraint violations
    // Step 1: Offset all track orders to temporary high values
    // Step 2: Update to final values
    return await this.drizzle.db.transaction(async (tx) => {
      const trackIds = trackOrders.map((item) => item.trackId);
      const offset = 100000; // Large offset to avoid conflicts

      // Step 1: Add offset to all tracks being reordered
      await tx.execute(sql`
        UPDATE playlist_tracks
        SET track_order = track_order + ${offset}
        WHERE playlist_id = ${playlistId}
          AND track_id IN (${sql.join(
            trackIds.map((id) => sql`${id}`),
            sql`, `
          )})
      `);

      // Step 2: Update to final values
      const caseWhenClauses = trackOrders.map(
        (item) => sql`WHEN ${item.trackId} THEN ${item.order}`
      );

      await tx.execute(sql`
        UPDATE playlist_tracks
        SET track_order = CASE track_id ${sql.join(caseWhenClauses, sql` `)} ELSE track_order END
        WHERE playlist_id = ${playlistId}
          AND track_id IN (${sql.join(
            trackIds.map((id) => sql`${id}`),
            sql`, `
          )})
      `);

      return true;
    });
  }

  async isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(playlistTracks)
      .where(and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, trackId)));

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Find playlists that contain tracks from a specific artist.
   * Returns public playlists + the current user's own playlists (even if private).
   */
  async findPublicByArtistId(
    artistId: string,
    skip: number,
    take: number,
    userId?: string
  ): Promise<Playlist[]> {
    const visibilityFilter = userId
      ? or(eq(playlists.public, true), eq(playlists.ownerId, userId))
      : eq(playlists.public, true);

    const result = await this.drizzle.db
      .selectDistinct({
        playlist: playlists,
      })
      .from(playlists)
      .innerJoin(playlistTracks, eq(playlists.id, playlistTracks.playlistId))
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(and(visibilityFilter, eq(tracks.artistId, artistId)))
      .orderBy(desc(playlists.createdAt))
      .offset(skip)
      .limit(take);

    return result.map((r) => PlaylistMapper.toDomain(r.playlist));
  }

  /**
   * Count playlists that contain tracks from a specific artist.
   * Counts public playlists + the current user's own playlists (even if private).
   */
  async countPublicByArtistId(artistId: string, userId?: string): Promise<number> {
    const visibilityFilter = userId
      ? or(eq(playlists.public, true), eq(playlists.ownerId, userId))
      : eq(playlists.public, true);

    const result = await this.drizzle.db
      .selectDistinct({ id: playlists.id })
      .from(playlists)
      .innerJoin(playlistTracks, eq(playlists.id, playlistTracks.playlistId))
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(and(visibilityFilter, eq(tracks.artistId, artistId)));

    return result.length;
  }
}
