import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, inArray, or, sql, sum } from 'drizzle-orm';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  userPlayStats,
  tracks,
  artists,
  albums,
  playlists,
  playlistTracks,
  friendships,
  playQueues,
} from '@infrastructure/database/schema';
import { NotFoundError } from '@shared/errors';
import {
  GetPublicProfileInput,
  GetPublicProfileOutput,
  TopTrack,
  TopArtist,
  TopAlbum,
  PublicPlaylist,
  FriendshipStatus,
  ProfileStats,
  ListeningNow,
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

    // 2. Get social data (always fetched)
    const [friendshipData, stats] = await Promise.all([
      this.getFriendshipStatus(input.userId, input.requesterId),
      this.getProfileStats(input.userId),
    ]);

    // 3. Get listening now only if they are friends
    let listeningNow: ListeningNow | undefined;
    if (friendshipData.status === 'accepted') {
      listeningNow = await this.getListeningNow(input.userId);
    }

    const social = {
      friendshipStatus: friendshipData.status,
      friendshipId: friendshipData.friendshipId,
      stats,
      listeningNow,
    };

    // If profile is private, return minimal info with social data
    if (!user.isPublicProfile) {
      return {
        user: publicUser,
        settings: {
          showTopTracks: false,
          showTopArtists: false,
          showTopAlbums: false,
          showPlaylists: false,
        },
        social,
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
      social,
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

  private async getFriendshipStatus(
    userId: string,
    requesterId?: string,
  ): Promise<{ status: FriendshipStatus; friendshipId?: string }> {
    // If no requester or same user, return appropriate status
    if (!requesterId) {
      return { status: 'none' };
    }
    if (requesterId === userId) {
      return { status: 'self' };
    }

    // Check for existing friendship
    const friendship = await this.drizzle.db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        status: friendships.status,
      })
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, requesterId),
            eq(friendships.addresseeId, userId),
          ),
          and(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, requesterId),
          ),
        ),
      )
      .limit(1);

    if (friendship.length === 0) {
      return { status: 'none' };
    }

    const f = friendship[0];
    if (f.status === 'accepted') {
      return { status: 'accepted', friendshipId: f.id };
    }

    // Pending - determine direction
    if (f.requesterId === requesterId) {
      return { status: 'pending_sent', friendshipId: f.id };
    } else {
      return { status: 'pending_received', friendshipId: f.id };
    }
  }

  private async getProfileStats(userId: string): Promise<ProfileStats> {
    // Get total plays
    const playsResult = await this.drizzle.db
      .select({
        total: sum(userPlayStats.playCount),
      })
      .from(userPlayStats)
      .where(
        and(
          eq(userPlayStats.userId, userId),
          eq(userPlayStats.itemType, 'track'),
        ),
      );

    const totalPlays = Number(playsResult[0]?.total) || 0;

    // Get friend count (accepted friendships)
    const friendsResult = await this.drizzle.db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId),
          ),
        ),
      );

    const friendCount = Number(friendsResult[0]?.count) || 0;

    return { totalPlays, friendCount };
  }

  private async getListeningNow(userId: string): Promise<ListeningNow | undefined> {
    // Get current playing track from play_queues
    const result = await this.drizzle.db
      .select({
        trackId: playQueues.currentTrackId,
        isPlaying: playQueues.isPlaying,
        trackTitle: tracks.title,
        artistName: tracks.artistName,
        albumId: tracks.albumId,
        coverArtPath: albums.coverArtPath,
      })
      .from(playQueues)
      .innerJoin(tracks, eq(tracks.id, playQueues.currentTrackId))
      .leftJoin(albums, eq(albums.id, tracks.albumId))
      .where(eq(playQueues.userId, userId))
      .limit(1);

    const r = result[0];
    if (!r || !r.isPlaying || !r.trackId) {
      return undefined;
    }

    return {
      trackId: r.trackId,
      trackTitle: r.trackTitle,
      artistName: r.artistName ?? undefined,
      albumId: r.albumId ?? undefined,
      coverArtPath: r.coverArtPath ?? undefined,
    };
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

  private async getTopArtists(userId: string, limit = 6): Promise<TopArtist[]> {
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

  private async getTopAlbums(userId: string, limit = 6): Promise<TopAlbum[]> {
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

    // Get artist names in a single query using inArray
    const artistIds = [...new Set(
      results
        .map((r) => r.artistId)
        .filter((id): id is string => !!id)
    )];

    let artistMap: Record<string, string> = {};
    if (artistIds.length > 0) {
      const artistResults = await this.drizzle.db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(inArray(artists.id, artistIds));

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

    // Fetch album IDs for all playlists in a single query (for cover mosaic)
    const playlistIds = results.map((r) => r.id);
    const albumIdsMap: Record<string, string[]> = {};

    if (playlistIds.length > 0) {
      // Single query to get first 4 albums for each playlist
      // We use a subquery approach: get all tracks ordered, then filter in JS
      const allTrackResults = await this.drizzle.db
        .select({
          playlistId: playlistTracks.playlistId,
          albumId: tracks.albumId,
          trackOrder: playlistTracks.trackOrder,
        })
        .from(playlistTracks)
        .innerJoin(tracks, eq(tracks.id, playlistTracks.trackId))
        .where(inArray(playlistTracks.playlistId, playlistIds))
        .orderBy(playlistTracks.playlistId, playlistTracks.trackOrder);

      // Group by playlist and take first 4 unique albums per playlist
      for (const playlistId of playlistIds) {
        const playlistAlbumIds = allTrackResults
          .filter((t) => t.playlistId === playlistId)
          .map((t) => t.albumId)
          .filter((id): id is string => !!id);

        // Get unique album IDs, maintaining order, limit to 4
        const uniqueAlbums: string[] = [];
        for (const albumId of playlistAlbumIds) {
          if (!uniqueAlbums.includes(albumId)) {
            uniqueAlbums.push(albumId);
            if (uniqueAlbums.length >= 4) break;
          }
        }
        albumIdsMap[playlistId] = uniqueAlbums;
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
