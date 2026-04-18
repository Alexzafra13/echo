import { Injectable } from '@nestjs/common';
import { sql, eq, and, desc, asc, inArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  genres,
  trackGenres,
  albumGenres,
  artistGenres,
  albums,
  tracks,
  artists,
} from '@infrastructure/database/schema';
import { Genre } from '../../domain/entities/genre.entity';
import {
  IGenreRepository,
  ListGenresParams,
  GenreAlbumsQuery,
  GenreTracksQuery,
  GenreArtistsQuery,
  PaginatedResult,
  GenreSortField,
  AlbumInGenreSortField,
  TrackInGenreSortField,
  ArtistInGenreSortField,
  SortOrder,
} from '../../domain/ports/genre-repository.port';
import { Album } from '@features/albums/domain/entities/album.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { Artist } from '@features/artists/domain/entities/artist.entity';
import { AlbumMapper } from '@features/albums/infrastructure/persistence/album.mapper';
import { TrackMapper } from '@features/tracks/infrastructure/persistence/track.mapper';
import { ArtistMapper } from '@features/artists/infrastructure/persistence/artist.mapper';

type GenreRow = {
  id: string;
  name: string;
  trackCount: number;
  albumCount: number;
  artistCount: number;
  coverAlbumId: string | null;
  coverAlbumUpdatedAt: Date | null;
  coverAlbumExternalInfoUpdatedAt: Date | null;
  [key: string]: unknown;
};

@Injectable()
export class DrizzleGenreRepository implements IGenreRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async list(params: ListGenresParams): Promise<Genre[]> {
    const { skip, take, sort, order, search } = params;

    const orderSql = this.buildGenreOrderBy(sort, order);
    const searchCondition = search ? sql`AND g.name ILIKE ${`%${search}%`}` : sql``;

    const result = await this.drizzle.db.execute<GenreRow>(sql`
      SELECT
        g.id,
        g.name,
        (SELECT COUNT(*)::int FROM track_genres WHERE genre_id = g.id) AS "trackCount",
        (SELECT COUNT(*)::int FROM album_genres WHERE genre_id = g.id) AS "albumCount",
        (SELECT COUNT(DISTINCT artist_id)::int FROM artist_genres WHERE genre_id = g.id) AS "artistCount",
        cover.id AS "coverAlbumId",
        cover.updated_at AS "coverAlbumUpdatedAt",
        cover.external_info_updated_at AS "coverAlbumExternalInfoUpdatedAt"
      FROM genres g
      LEFT JOIN LATERAL (
        SELECT a.id, a.updated_at, a.external_info_updated_at
        FROM albums a
        INNER JOIN album_genres ag ON ag.album_id = a.id
        WHERE ag.genre_id = g.id
        ORDER BY a.song_count DESC, a.name ASC
        LIMIT 1
      ) cover ON TRUE
      WHERE EXISTS(SELECT 1 FROM track_genres WHERE genre_id = g.id)
      ${searchCondition}
      ${orderSql}
      LIMIT ${take}
      OFFSET ${skip}
    `);

    return result.rows.map((row) => this.rowToEntity(row));
  }

  async count(search?: string): Promise<number> {
    const searchCondition = search ? sql`AND g.name ILIKE ${`%${search}%`}` : sql``;

    const result = await this.drizzle.db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM genres g
      WHERE EXISTS(SELECT 1 FROM track_genres WHERE genre_id = g.id)
      ${searchCondition}
    `);

    return result.rows[0]?.total ?? 0;
  }

  async findById(id: string): Promise<Genre | null> {
    const result = await this.drizzle.db.execute<GenreRow>(sql`
      SELECT
        g.id,
        g.name,
        (SELECT COUNT(*)::int FROM track_genres WHERE genre_id = g.id) AS "trackCount",
        (SELECT COUNT(*)::int FROM album_genres WHERE genre_id = g.id) AS "albumCount",
        (SELECT COUNT(DISTINCT artist_id)::int FROM artist_genres WHERE genre_id = g.id) AS "artistCount",
        cover.id AS "coverAlbumId",
        cover.updated_at AS "coverAlbumUpdatedAt",
        cover.external_info_updated_at AS "coverAlbumExternalInfoUpdatedAt"
      FROM genres g
      LEFT JOIN LATERAL (
        SELECT a.id, a.updated_at, a.external_info_updated_at
        FROM albums a
        INNER JOIN album_genres ag ON ag.album_id = a.id
        WHERE ag.genre_id = g.id
        ORDER BY a.song_count DESC, a.name ASC
        LIMIT 1
      ) cover ON TRUE
      WHERE g.id = ${id}
      LIMIT 1
    `);

    const row = result.rows[0];
    return row ? this.rowToEntity(row) : null;
  }

  async findAlbumsByGenre(query: GenreAlbumsQuery): Promise<PaginatedResult<Album>> {
    const { genreId, skip, take, sort, order } = query;

    const [albumIdsResult, countResult] = await Promise.all([
      this.selectAlbumIdsByGenre(genreId, skip, take, sort, order),
      this.drizzle.db
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(albumGenres)
        .where(eq(albumGenres.genreId, genreId)),
    ]);

    const total = countResult[0]?.total ?? 0;

    if (albumIdsResult.length === 0) {
      return { data: [], total };
    }

    const orderedIds = albumIdsResult.map((r) => r.id);

    const albumRows = await this.drizzle.db
      .select({ album: albums, artistName: artists.name })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(inArray(albums.id, orderedIds));

    const albumMap = new Map(
      albumRows.map((r) => [
        r.album.id,
        AlbumMapper.toDomain({
          ...r.album,
          artist: r.artistName ? { name: r.artistName } : undefined,
        }),
      ])
    );

    const data = orderedIds
      .map((id) => albumMap.get(id))
      .filter((a): a is Album => a != null);

    return { data, total };
  }

  async findTracksByGenre(query: GenreTracksQuery): Promise<PaginatedResult<Track>> {
    const { genreId, skip, take, sort, order } = query;

    const [trackIdsResult, countResult] = await Promise.all([
      this.selectTrackIdsByGenre(genreId, skip, take, sort, order),
      this.drizzle.db
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(trackGenres)
        .where(eq(trackGenres.genreId, genreId)),
    ]);

    const total = countResult[0]?.total ?? 0;

    if (trackIdsResult.length === 0) {
      return { data: [], total };
    }

    const orderedIds = trackIdsResult.map((r) => r.id);

    const trackRows = await this.drizzle.db
      .select()
      .from(tracks)
      .where(inArray(tracks.id, orderedIds));

    const trackMap = new Map(trackRows.map((r) => [r.id, TrackMapper.toDomain(r)]));

    const data = orderedIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t != null);

    return { data, total };
  }

  async findArtistsByGenre(query: GenreArtistsQuery): Promise<PaginatedResult<Artist>> {
    const { genreId, skip, take, sort, order } = query;

    const [artistIdsResult, countResult] = await Promise.all([
      this.selectArtistIdsByGenre(genreId, skip, take, sort, order),
      this.drizzle.db
        .select({ total: sql<number>`COUNT(DISTINCT ${artistGenres.artistId})::int` })
        .from(artistGenres)
        .where(eq(artistGenres.genreId, genreId)),
    ]);

    const total = countResult[0]?.total ?? 0;

    if (artistIdsResult.length === 0) {
      return { data: [], total };
    }

    const orderedIds = artistIdsResult.map((r) => r.id);

    const artistRows = await this.drizzle.db
      .select()
      .from(artists)
      .where(inArray(artists.id, orderedIds));

    const artistMap = new Map(artistRows.map((r) => [r.id, ArtistMapper.toDomain(r)]));

    const data = orderedIds
      .map((id) => artistMap.get(id))
      .filter((a): a is Artist => a != null);

    return { data, total };
  }

  private async selectAlbumIdsByGenre(
    genreId: string,
    skip: number,
    take: number,
    sort: AlbumInGenreSortField,
    order: SortOrder
  ): Promise<Array<{ id: string }>> {
    if (sort === 'playCount') {
      const rows = await this.drizzle.db.execute<{ id: string }>(sql`
        SELECT a.id
        FROM albums a
        INNER JOIN album_genres ag ON ag.album_id = a.id
        LEFT JOIN (
          SELECT item_id, SUM(play_count)::bigint AS total_plays
          FROM user_play_stats
          WHERE item_type = 'album'
          GROUP BY item_id
        ) stats ON stats.item_id = a.id
        WHERE ag.genre_id = ${genreId}
        ORDER BY COALESCE(stats.total_plays, 0) ${sql.raw(order === 'asc' ? 'ASC' : 'DESC')}, a.name ASC
        LIMIT ${take}
        OFFSET ${skip}
      `);
      return rows.rows;
    }

    const orderByClause = this.buildAlbumOrderBy(sort, order);

    const rows = await this.drizzle.db
      .select({ id: albums.id })
      .from(albums)
      .innerJoin(albumGenres, eq(albumGenres.albumId, albums.id))
      .where(eq(albumGenres.genreId, genreId))
      .orderBy(...orderByClause)
      .limit(take)
      .offset(skip);

    return rows;
  }

  private async selectTrackIdsByGenre(
    genreId: string,
    skip: number,
    take: number,
    sort: TrackInGenreSortField,
    order: SortOrder
  ): Promise<Array<{ id: string }>> {
    if (sort === 'playCount') {
      const rows = await this.drizzle.db.execute<{ id: string }>(sql`
        SELECT t.id
        FROM tracks t
        INNER JOIN track_genres tg ON tg.track_id = t.id
        LEFT JOIN (
          SELECT item_id, SUM(play_count)::bigint AS total_plays
          FROM user_play_stats
          WHERE item_type = 'track'
          GROUP BY item_id
        ) stats ON stats.item_id = t.id
        WHERE tg.genre_id = ${genreId}
        ORDER BY COALESCE(stats.total_plays, 0) ${sql.raw(order === 'asc' ? 'ASC' : 'DESC')}, t.title ASC
        LIMIT ${take}
        OFFSET ${skip}
      `);
      return rows.rows;
    }

    const orderByClause = this.buildTrackOrderBy(sort, order);

    const rows = await this.drizzle.db
      .select({ id: tracks.id })
      .from(tracks)
      .innerJoin(trackGenres, eq(trackGenres.trackId, tracks.id))
      .where(eq(trackGenres.genreId, genreId))
      .orderBy(...orderByClause)
      .limit(take)
      .offset(skip);

    return rows;
  }

  private async selectArtistIdsByGenre(
    genreId: string,
    skip: number,
    take: number,
    sort: ArtistInGenreSortField,
    order: SortOrder
  ): Promise<Array<{ id: string }>> {
    const orderByClause = this.buildArtistOrderBy(sort, order);

    const rows = await this.drizzle.db
      .select({ id: artists.id })
      .from(artists)
      .innerJoin(artistGenres, eq(artistGenres.artistId, artists.id))
      .where(eq(artistGenres.genreId, genreId))
      .orderBy(...orderByClause)
      .limit(take)
      .offset(skip);

    return rows;
  }

  private buildGenreOrderBy(sort: GenreSortField, order: SortOrder) {
    const dir = order === 'asc' ? sql.raw('ASC') : sql.raw('DESC');
    switch (sort) {
      case 'name':
        return sql`ORDER BY g.name ${dir}`;
      case 'albumCount':
        return sql`ORDER BY "albumCount" ${dir}, g.name ASC`;
      case 'trackCount':
      default:
        return sql`ORDER BY "trackCount" ${dir}, g.name ASC`;
    }
  }

  private buildAlbumOrderBy(sort: AlbumInGenreSortField, order: SortOrder) {
    const dirFn = order === 'asc' ? asc : desc;
    switch (sort) {
      case 'title':
        return [dirFn(albums.name)];
      case 'releaseYear':
      default:
        return [dirFn(albums.year), asc(albums.name)];
    }
  }

  private buildTrackOrderBy(sort: TrackInGenreSortField, order: SortOrder) {
    const dirFn = order === 'asc' ? asc : desc;
    switch (sort) {
      case 'title':
        return [dirFn(tracks.title)];
      case 'releaseYear':
        return [dirFn(tracks.year), asc(tracks.title)];
      default:
        return [dirFn(tracks.title)];
    }
  }

  private buildArtistOrderBy(sort: ArtistInGenreSortField, order: SortOrder) {
    const dirFn = order === 'asc' ? asc : desc;
    switch (sort) {
      case 'albumCount':
        return [dirFn(artists.albumCount), asc(artists.name)];
      case 'songCount':
        return [dirFn(artists.songCount), asc(artists.name)];
      case 'name':
      default:
        return [dirFn(artists.name)];
    }
  }

  private rowToEntity(row: GenreRow): Genre {
    return Genre.reconstruct({
      id: row.id,
      name: row.name,
      trackCount: Number(row.trackCount) || 0,
      albumCount: Number(row.albumCount) || 0,
      artistCount: Number(row.artistCount) || 0,
      coverAlbumId: row.coverAlbumId ?? undefined,
      coverAlbumUpdatedAt: row.coverAlbumUpdatedAt ?? undefined,
      coverAlbumExternalInfoUpdatedAt: row.coverAlbumExternalInfoUpdatedAt ?? undefined,
    });
  }
}
