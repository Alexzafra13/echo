import { Injectable } from '@nestjs/common';
import { eq, count, or, ilike } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { albums, tracks, artists } from '@infrastructure/database/schema';
import { djAnalysis } from '@infrastructure/database/schema/dj';

export interface FederationAlbumRow {
  id: string;
  name: string;
  year: number | null;
  songCount: number | null;
  duration: number | null;
  size: number | null;
  coverArtPath: string | null;
  artistId: string | null;
  artistName: string | null;
}

export interface FederationTrackRow {
  id: string;
  title: string;
  trackNumber: number | null;
  discNumber: number | null;
  duration: number | null;
  size: number | null;
  bitRate: number | null;
  suffix: string | null;
  artistId: string | null;
  artistName: string | null;
  rgTrackGain: number | null;
  rgTrackPeak: number | null;
  rgAlbumGain: number | null;
  rgAlbumPeak: number | null;
  bpm: number | null;
  initialKey: string | null;
  outroStart: number | null;
  lufsAnalyzedAt: Date | null;
  djStatus: string | null;
  djBpm: number | null;
  djKey: string | null;
  djCamelotKey: string | null;
  djEnergy: number | null;
  djDanceability: number | null;
  djAnalysisError: string | null;
  djAnalyzedAt: Date | null;
}

export interface FederationExportTrackRow extends FederationTrackRow {
  discSubtitle: string | null;
  channels: number | null;
  year: number | null;
  date: string | null;
  originalDate: string | null;
  releaseDate: string | null;
  artistNameTag: string | null;
  albumArtistName: string | null;
  comment: string | null;
  lyrics: string | null;
  mbzTrackId: string | null;
  mbzAlbumId: string | null;
  mbzArtistId: string | null;
  mbzAlbumArtistId: string | null;
  mbzReleaseTrackId: string | null;
  catalogNum: string | null;
  path: string;
}

export interface FederationExportAlbumRow extends FederationAlbumRow {
  releaseDate: string | null;
  originalDate: string | null;
  compilation: boolean | null;
  mbzAlbumId: string | null;
  mbzAlbumArtistId: string | null;
  mbzAlbumType: string | null;
  catalogNum: string | null;
  comment: string | null;
  description: string | null;
}

export interface LibraryCounts {
  albumCount: number;
  trackCount: number;
  artistCount: number;
}

@Injectable()
export class FederationLibraryRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async getCounts(): Promise<LibraryCounts> {
    const [albumCount] = await this.drizzle.db.select({ count: count() }).from(albums);
    const [trackCount] = await this.drizzle.db.select({ count: count() }).from(tracks);
    const [artistCount] = await this.drizzle.db.select({ count: count() }).from(artists);

    return {
      albumCount: Number(albumCount?.count ?? 0),
      trackCount: Number(trackCount?.count ?? 0),
      artistCount: Number(artistCount?.count ?? 0),
    };
  }

  async findAlbums(options: {
    limit: number;
    offset: number;
    search?: string;
  }): Promise<{ albums: FederationAlbumRow[]; total: number }> {
    const searchCondition = options.search
      ? or(ilike(albums.name, `%${options.search}%`), ilike(artists.name, `%${options.search}%`))
      : undefined;

    const baseQuery = this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
        size: albums.size,
        coverArtPath: albums.coverArtPath,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id));

    const albumsResult = searchCondition
      ? await baseQuery.where(searchCondition).limit(options.limit).offset(options.offset)
      : await baseQuery.limit(options.limit).offset(options.offset);

    const countBaseQuery = this.drizzle.db
      .select({ count: count() })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id));

    const [total] = searchCondition
      ? await countBaseQuery.where(searchCondition)
      : await countBaseQuery;

    return {
      albums: albumsResult,
      total: Number(total?.count ?? 0),
    };
  }

  async findAlbumById(id: string): Promise<FederationAlbumRow | null> {
    const [album] = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
        size: albums.size,
        coverArtPath: albums.coverArtPath,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);

    return album ?? null;
  }

  async findAlbumCoverPath(id: string): Promise<string | null> {
    const [album] = await this.drizzle.db
      .select({ coverArtPath: albums.coverArtPath })
      .from(albums)
      .where(eq(albums.id, id))
      .limit(1);

    return album?.coverArtPath ?? null;
  }

  async findTrackPath(trackId: string): Promise<{ path: string; size: number | null } | null> {
    const [track] = await this.drizzle.db
      .select({ path: tracks.path, size: tracks.size })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    return track ?? null;
  }

  async findAlbumTracks(albumId: string): Promise<FederationTrackRow[]> {
    return this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
        duration: tracks.duration,
        size: tracks.size,
        bitRate: tracks.bitRate,
        suffix: tracks.suffix,
        artistId: artists.id,
        artistName: artists.name,
        rgTrackGain: tracks.rgTrackGain,
        rgTrackPeak: tracks.rgTrackPeak,
        rgAlbumGain: tracks.rgAlbumGain,
        rgAlbumPeak: tracks.rgAlbumPeak,
        bpm: tracks.bpm,
        initialKey: tracks.initialKey,
        outroStart: tracks.outroStart,
        lufsAnalyzedAt: tracks.lufsAnalyzedAt,
        djStatus: djAnalysis.status,
        djBpm: djAnalysis.bpm,
        djKey: djAnalysis.key,
        djCamelotKey: djAnalysis.camelotKey,
        djEnergy: djAnalysis.energy,
        djDanceability: djAnalysis.danceability,
        djAnalysisError: djAnalysis.analysisError,
        djAnalyzedAt: djAnalysis.analyzedAt,
      })
      .from(tracks)
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .leftJoin(djAnalysis, eq(tracks.id, djAnalysis.trackId))
      .where(eq(tracks.albumId, albumId))
      .orderBy(tracks.discNumber, tracks.trackNumber);
  }

  async findAlbumDjAnalysis(albumId: string) {
    return this.drizzle.db
      .select({
        trackId: tracks.id,
        status: djAnalysis.status,
        bpm: djAnalysis.bpm,
        key: djAnalysis.key,
        camelotKey: djAnalysis.camelotKey,
        energy: djAnalysis.energy,
        danceability: djAnalysis.danceability,
        analysisError: djAnalysis.analysisError,
        analyzedAt: djAnalysis.analyzedAt,
      })
      .from(tracks)
      .innerJoin(djAnalysis, eq(tracks.id, djAnalysis.trackId))
      .where(eq(tracks.albumId, albumId));
  }

  async findAlbumForExport(id: string): Promise<FederationExportAlbumRow | null> {
    const [album] = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        year: albums.year,
        releaseDate: albums.releaseDate,
        originalDate: albums.originalDate,
        compilation: albums.compilation,
        songCount: albums.songCount,
        duration: albums.duration,
        size: albums.size,
        coverArtPath: albums.coverArtPath,
        mbzAlbumId: albums.mbzAlbumId,
        mbzAlbumArtistId: albums.mbzAlbumArtistId,
        mbzAlbumType: albums.mbzAlbumType,
        catalogNum: albums.catalogNum,
        comment: albums.comment,
        description: albums.description,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);

    return album ?? null;
  }

  async findAlbumTracksForExport(albumId: string) {
    return this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
        discSubtitle: tracks.discSubtitle,
        duration: tracks.duration,
        size: tracks.size,
        bitRate: tracks.bitRate,
        channels: tracks.channels,
        suffix: tracks.suffix,
        year: tracks.year,
        date: tracks.date,
        originalDate: tracks.originalDate,
        releaseDate: tracks.releaseDate,
        artistName: tracks.artistName,
        albumArtistName: tracks.albumArtistName,
        comment: tracks.comment,
        lyrics: tracks.lyrics,
        bpm: tracks.bpm,
        rgAlbumGain: tracks.rgAlbumGain,
        rgAlbumPeak: tracks.rgAlbumPeak,
        rgTrackGain: tracks.rgTrackGain,
        rgTrackPeak: tracks.rgTrackPeak,
        lufsAnalyzedAt: tracks.lufsAnalyzedAt,
        mbzTrackId: tracks.mbzTrackId,
        mbzAlbumId: tracks.mbzAlbumId,
        mbzArtistId: tracks.mbzArtistId,
        mbzAlbumArtistId: tracks.mbzAlbumArtistId,
        mbzReleaseTrackId: tracks.mbzReleaseTrackId,
        catalogNum: tracks.catalogNum,
        path: tracks.path,
        djStatus: djAnalysis.status,
        djBpm: djAnalysis.bpm,
        djKey: djAnalysis.key,
        djCamelotKey: djAnalysis.camelotKey,
        djEnergy: djAnalysis.energy,
        djDanceability: djAnalysis.danceability,
        djAnalysisError: djAnalysis.analysisError,
        djAnalyzedAt: djAnalysis.analyzedAt,
      })
      .from(tracks)
      .leftJoin(djAnalysis, eq(tracks.id, djAnalysis.trackId))
      .where(eq(tracks.albumId, albumId))
      .orderBy(tracks.discNumber, tracks.trackNumber);
  }

  async findAlbumForDownload(id: string) {
    const [album] = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        coverArtPath: albums.coverArtPath,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);

    return album ?? null;
  }

  async findAlbumTrackPaths(albumId: string) {
    return this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        path: tracks.path,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
      })
      .from(tracks)
      .where(eq(tracks.albumId, albumId))
      .orderBy(tracks.discNumber, tracks.trackNumber);
  }
}
