import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  userPlayStats,
  tracks,
  artists,
  albums,
  playlists,
  playlistTracks,
} from '@infrastructure/database/schema';
import { NotFoundError } from '@shared/errors';
import {
  GetPublicProfileInput,
  GetPublicProfileOutput,
  TopTrack,
  TopArtist,
  TopAlbum,
  PublicPlaylist,
} from './get-public-profile.dto';

@Injectable()
export class GetPublicProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly drizzle: DrizzleService,
  ) {}

  async execute(input: GetPublicProfileInput): Promise<GetPublicProfileOutput> {
    // 1. Get user
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    const publicUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      hasAvatar: !!user.avatarPath,
      bio: user.bio,
      isPublicProfile: user.isPublicProfile,
      createdAt: user.createdAt,
    };

    // If profile is private, return minimal info
    if (!user.isPublicProfile) {
      return {
        user: publicUser,
        settings: {
          showTopTracks: false,
          showTopArtists: false,
          showTopAlbums: false,
          showPlaylists: false,
        },
      };
    }

    // Profile is public, fetch data based on settings
    const result: GetPublicProfileOutput = {
      user: publicUser,
      settings: {
        showTopTracks: user.showTopTracks,
        showTopArtists: user.showTopArtists,
        showTopAlbums: user.showTopAlbums,
        showPlaylists: user.showPlaylists,
      },
    };

    // Fetch top tracks if enabled
    if (user.showTopTracks) {
      result.topTracks = await this.getTopTracks(user.id);
    }

    // Fetch top artists if enabled
    if (user.showTopArtists) {
      result.topArtists = await this.getTopArtists(user.id);
    }

    // Fetch top albums if enabled
    if (user.showTopAlbums) {
      result.topAlbums = await this.getTopAlbums(user.id);
    }

    // Fetch public playlists if enabled
    if (user.showPlaylists) {
      result.playlists = await this.getPublicPlaylists(user.id);
    }

    return result;
  }

  private async getTopTracks(userId: string, limit = 10): Promise<TopTrack[]> {
    const results = await this.drizzle.db
      .select({
        trackId: userPlayStats.itemId,
        playCount: userPlayStats.playCount,
        title: tracks.title,
        artistName: tracks.artistName,
        albumName: tracks.albumName,
        albumId: tracks.albumId,
        artistId: tracks.artistId,
        coverArtPath: albums.coverArtPath,
      })
      .from(userPlayStats)
      .innerJoin(tracks, eq(tracks.id, userPlayStats.itemId))
      .leftJoin(albums, eq(albums.id, tracks.albumId))
      .where(
        and(
          eq(userPlayStats.userId, userId),
          eq(userPlayStats.itemType, 'track')
        )
      )
      .orderBy(desc(userPlayStats.playCount))
      .limit(limit);

    return results.map((r) => ({
      id: r.trackId,
      title: r.title,
      artistName: r.artistName ?? undefined,
      albumName: r.albumName ?? undefined,
      albumId: r.albumId ?? undefined,
      artistId: r.artistId ?? undefined,
      playCount: Number(r.playCount),
      coverArtPath: r.coverArtPath ?? undefined,
    }));
  }

  private async getTopArtists(userId: string, limit = 10): Promise<TopArtist[]> {
    const results = await this.drizzle.db
      .select({
        artistId: userPlayStats.itemId,
        playCount: userPlayStats.playCount,
        name: artists.name,
        profileImagePath: artists.profileImagePath,
        externalProfilePath: artists.externalProfilePath,
      })
      .from(userPlayStats)
      .innerJoin(artists, eq(artists.id, userPlayStats.itemId))
      .where(
        and(
          eq(userPlayStats.userId, userId),
          eq(userPlayStats.itemType, 'artist')
        )
      )
      .orderBy(desc(userPlayStats.playCount))
      .limit(limit);

    return results.map((r) => ({
      id: r.artistId,
      name: r.name,
      profileImagePath: r.profileImagePath ?? undefined,
      externalProfilePath: r.externalProfilePath ?? undefined,
      playCount: Number(r.playCount),
    }));
  }

  private async getTopAlbums(userId: string, limit = 10): Promise<TopAlbum[]> {
    const results = await this.drizzle.db
      .select({
        albumId: userPlayStats.itemId,
        playCount: userPlayStats.playCount,
        name: albums.name,
        artistId: albums.artistId,
        coverArtPath: albums.coverArtPath,
        year: albums.year,
      })
      .from(userPlayStats)
      .innerJoin(albums, eq(albums.id, userPlayStats.itemId))
      .where(
        and(
          eq(userPlayStats.userId, userId),
          eq(userPlayStats.itemType, 'album')
        )
      )
      .orderBy(desc(userPlayStats.playCount))
      .limit(limit);

    // Get artist names
    const artistIds = results
      .map((r) => r.artistId)
      .filter((id): id is string => !!id);

    let artistMap: Record<string, string> = {};
    if (artistIds.length > 0) {
      const artistResults = await this.drizzle.db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(eq(artists.id, artistIds[0])); // Simple version, could be improved

      artistMap = Object.fromEntries(
        artistResults.map((a) => [a.id, a.name])
      );
    }

    return results.map((r) => ({
      id: r.albumId,
      name: r.name,
      artistId: r.artistId ?? undefined,
      artistName: r.artistId ? artistMap[r.artistId] : undefined,
      coverArtPath: r.coverArtPath ?? undefined,
      playCount: Number(r.playCount),
      year: r.year ?? undefined,
    }));
  }

  private async getPublicPlaylists(userId: string, limit = 20): Promise<PublicPlaylist[]> {
    const results = await this.drizzle.db
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        coverImageUrl: playlists.coverImageUrl,
        songCount: playlists.songCount,
        duration: playlists.duration,
        createdAt: playlists.createdAt,
      })
      .from(playlists)
      .where(
        and(
          eq(playlists.ownerId, userId),
          eq(playlists.public, true)
        )
      )
      .orderBy(desc(playlists.createdAt))
      .limit(limit);

    // Fetch album IDs for each playlist (for cover mosaic)
    const playlistIds = results.map((r) => r.id);
    const albumIdsMap: Record<string, string[]> = {};

    if (playlistIds.length > 0) {
      for (const playlistId of playlistIds) {
        const trackResults = await this.drizzle.db
          .select({ albumId: tracks.albumId })
          .from(playlistTracks)
          .innerJoin(tracks, eq(tracks.id, playlistTracks.trackId))
          .where(eq(playlistTracks.playlistId, playlistId))
          .orderBy(playlistTracks.trackOrder)
          .limit(4);

        albumIdsMap[playlistId] = trackResults
          .map((t) => t.albumId)
          .filter((id): id is string => !!id);
      }
    }

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      coverImageUrl: r.coverImageUrl ?? undefined,
      songCount: r.songCount,
      duration: r.duration,
      createdAt: r.createdAt,
      albumIds: albumIdsMap[r.id] || [],
    }));
  }
}
