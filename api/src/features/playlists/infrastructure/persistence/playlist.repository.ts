import { Injectable } from '@nestjs/common';
import { eq, desc, and, count, sql, inArray, asc, max } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { createSearchPattern } from '@shared/utils';
import { playlists, playlistTracks, tracks, albums, artists } from '@infrastructure/database/schema';
import { IPlaylistRepository, TrackWithPlaylistOrder, PlaylistUpdateInput } from '../../domain/ports';
import { Playlist, PlaylistTrack } from '../../domain/entities';
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
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(playlists);

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

  async update(id: string, playlist: PlaylistUpdateInput): Promise<Playlist | null> {
    // Extraer propiedades (funciona tanto con Playlist entity como PlaylistProps parcial)
    const props = 'toPrimitives' in playlist ? playlist.toPrimitives() : playlist;

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
    const result = await this.drizzle.db
      .delete(playlists)
      .where(eq(playlists.id, id))
      .returning();

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
      .where(
        and(
          eq(playlistTracks.playlistId, playlistId),
          eq(playlistTracks.trackId, trackId),
        ),
      )
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
    trackOrders: Array<{ trackId: string; order: number }>,
  ): Promise<boolean> {
    if (trackOrders.length === 0) {
      return true;
    }

    // Build CASE/WHEN clause for bulk update (single query instead of N queries)
    // Each WHEN clause is properly parameterized to prevent SQL injection
    const trackIds = trackOrders.map((item) => item.trackId);
    const caseWhenClauses = trackOrders.map(
      (item) => sql`WHEN ${item.trackId} THEN ${item.order}`,
    );

    await this.drizzle.db.execute(sql`
      UPDATE ${playlistTracks}
      SET track_order = CASE track_id ${sql.join(caseWhenClauses, sql` `)} END
      WHERE playlist_id = ${playlistId}
        AND track_id IN (${sql.join(trackIds.map(id => sql`${id}`), sql`, `)})
    `);

    return true;
  }

  async isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(playlistTracks)
      .where(
        and(
          eq(playlistTracks.playlistId, playlistId),
          eq(playlistTracks.trackId, trackId),
        ),
      );

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Find playlists that contain tracks by a specific artist
   * Returns user's own playlists and public playlists
   */
  async findByArtistId(
    artistId: string,
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ playlists: Playlist[]; total: number }> {
    // Subquery to get playlist IDs that contain tracks by this artist
    const playlistIdsWithArtist = this.drizzle.db
      .selectDistinct({ playlistId: playlistTracks.playlistId })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(eq(tracks.artistId, artistId))
      .as('playlist_ids_with_artist');

    // Count total playlists (user's own OR public) that contain tracks by this artist
    const countResult = await this.drizzle.db
      .select({ count: count() })
      .from(playlists)
      .innerJoin(
        playlistIdsWithArtist,
        eq(playlists.id, playlistIdsWithArtist.playlistId),
      )
      .where(
        sql`(${playlists.ownerId} = ${userId} OR ${playlists.public} = true)`,
      );

    const total = countResult[0]?.count ?? 0;

    // Get paginated playlists
    const result = await this.drizzle.db
      .select({
        playlist: playlists,
      })
      .from(playlists)
      .innerJoin(
        playlistIdsWithArtist,
        eq(playlists.id, playlistIdsWithArtist.playlistId),
      )
      .where(
        sql`(${playlists.ownerId} = ${userId} OR ${playlists.public} = true)`,
      )
      .orderBy(desc(playlists.updatedAt))
      .offset(skip)
      .limit(take);

    return {
      playlists: PlaylistMapper.toDomainArray(result.map((r) => r.playlist)),
      total,
    };
  }
}
