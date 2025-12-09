import { Injectable } from '@nestjs/common';
import { eq, and, or, desc, sql, ilike, ne, inArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  friendships,
  users,
  playQueues,
  tracks,
  albums,
  artists,
  playlists,
  playlistTracks,
  userStarred,
} from '@infrastructure/database/schema';
import { ISocialRepository } from '../../domain/ports';
import {
  Friendship,
  FriendshipStatus,
  Friend,
  ListeningUser,
  ActivityItem,
} from '../../domain/entities/friendship.entity';

@Injectable()
export class DrizzleSocialRepository implements ISocialRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  // ============================================
  // Friendship operations
  // ============================================

  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    const [friendship] = await this.drizzle.db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId,
        status: 'pending',
      })
      .returning();

    return this.mapFriendship(friendship);
  }

  async createAcceptedFriendship(userId1: string, userId2: string): Promise<Friendship> {
    const [friendship] = await this.drizzle.db
      .insert(friendships)
      .values({
        requesterId: userId1,
        addresseeId: userId2,
        status: 'accepted',
      })
      .returning();

    return this.mapFriendship(friendship);
  }

  async acceptFriendRequest(friendshipId: string, userId: string): Promise<Friendship> {
    const [friendship] = await this.drizzle.db
      .update(friendships)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(friendships.id, friendshipId),
          eq(friendships.addresseeId, userId),
        ),
      )
      .returning();

    return this.mapFriendship(friendship);
  }

  async removeFriendship(friendshipId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .delete(friendships)
      .where(
        and(
          eq(friendships.id, friendshipId),
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId),
          ),
        ),
      );
  }

  async blockUser(requesterId: string, addresseeId: string): Promise<Friendship> {
    // First, remove any existing friendship
    await this.drizzle.db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
          and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId)),
        ),
      );

    // Then create a blocked relationship
    const [friendship] = await this.drizzle.db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId,
        status: 'blocked',
      })
      .returning();

    return this.mapFriendship(friendship);
  }

  async getFriendshipById(friendshipId: string): Promise<Friendship | null> {
    const [friendship] = await this.drizzle.db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId))
      .limit(1);

    return friendship ? this.mapFriendship(friendship) : null;
  }

  async getFriendshipBetweenUsers(userId1: string, userId2: string): Promise<Friendship | null> {
    const [friendship] = await this.drizzle.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
          and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1)),
        ),
      )
      .limit(1);

    return friendship ? this.mapFriendship(friendship) : null;
  }

  async getFriends(userId: string): Promise<Friend[]> {
    // Get friendships where user is either requester or addressee and status is accepted
    const results = await this.drizzle.db
      .select({
        friendshipId: friendships.id,
        friendsSince: friendships.updatedAt,
        // Friend user data (the other person)
        friendId: sql<string>`CASE
          WHEN ${friendships.requesterId} = ${userId} THEN ${friendships.addresseeId}
          ELSE ${friendships.requesterId}
        END`,
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

    if (results.length === 0) return [];

    // Get user details for friends
    const friendIds = results.map(r => r.friendId);
    const friendUsers = await this.drizzle.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarPath: users.avatarPath,
        isPublicProfile: users.isPublicProfile,
      })
      .from(users)
      .where(inArray(users.id, friendIds));

    const userMap = new Map(friendUsers.map(u => [u.id, u]));

    return results.map(r => {
      const user = userMap.get(r.friendId);
      return {
        id: user?.id || r.friendId,
        username: user?.username || '',
        name: user?.name || null,
        avatarPath: user?.avatarPath || null,
        isPublicProfile: user?.isPublicProfile || false,
        friendshipId: r.friendshipId,
        friendsSince: r.friendsSince,
      };
    });
  }

  async getPendingRequests(userId: string): Promise<Friend[]> {
    const results = await this.drizzle.db
      .select({
        friendshipId: friendships.id,
        friendsSince: friendships.createdAt,
        id: users.id,
        username: users.username,
        name: users.name,
        avatarPath: users.avatarPath,
        isPublicProfile: users.isPublicProfile,
      })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.requesterId))
      .where(
        and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, 'pending'),
        ),
      )
      .orderBy(desc(friendships.createdAt));

    return results.map(r => ({
      id: r.id,
      username: r.username,
      name: r.name,
      avatarPath: r.avatarPath,
      isPublicProfile: r.isPublicProfile,
      friendshipId: r.friendshipId,
      friendsSince: r.friendsSince,
    }));
  }

  async getSentRequests(userId: string): Promise<Friend[]> {
    const results = await this.drizzle.db
      .select({
        friendshipId: friendships.id,
        friendsSince: friendships.createdAt,
        id: users.id,
        username: users.username,
        name: users.name,
        avatarPath: users.avatarPath,
        isPublicProfile: users.isPublicProfile,
      })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.addresseeId))
      .where(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.status, 'pending'),
        ),
      )
      .orderBy(desc(friendships.createdAt));

    return results.map(r => ({
      id: r.id,
      username: r.username,
      name: r.name,
      avatarPath: r.avatarPath,
      isPublicProfile: r.isPublicProfile,
      friendshipId: r.friendshipId,
      friendsSince: r.friendsSince,
    }));
  }

  async countPendingRequests(userId: string): Promise<number> {
    const [result] = await this.drizzle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(friendships)
      .where(
        and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, 'pending'),
        ),
      );

    return result?.count || 0;
  }

  // ============================================
  // Listening Now operations
  // ============================================

  async getListeningFriends(userId: string): Promise<ListeningUser[]> {
    // First get friend IDs
    const friendResults = await this.drizzle.db
      .select({
        friendId: sql<string>`CASE
          WHEN ${friendships.requesterId} = ${userId} THEN ${friendships.addresseeId}
          ELSE ${friendships.requesterId}
        END`,
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

    if (friendResults.length === 0) return [];

    const friendIds = friendResults.map(f => f.friendId);

    // Get listening status for friends
    const results = await this.drizzle.db
      .select({
        userId: users.id,
        username: users.username,
        name: users.name,
        avatarPath: users.avatarPath,
        isPlaying: playQueues.isPlaying,
        updatedAt: playQueues.updatedAt,
        trackId: tracks.id,
        trackTitle: tracks.title,
        albumId: albums.id,
        albumName: albums.name,
        albumCoverPath: albums.coverArtPath,
        artistName: artists.name,
      })
      .from(users)
      .leftJoin(playQueues, eq(playQueues.userId, users.id))
      .leftJoin(tracks, eq(tracks.id, playQueues.currentTrackId))
      .leftJoin(albums, eq(albums.id, tracks.albumId))
      .leftJoin(artists, eq(artists.id, tracks.artistId))
      .where(inArray(users.id, friendIds));

    return results.map(r => ({
      id: r.userId,
      username: r.username,
      name: r.name,
      avatarPath: r.avatarPath,
      isPlaying: r.isPlaying || false,
      currentTrack: r.trackId
        ? {
            id: r.trackId,
            title: r.trackTitle || '',
            artistName: r.artistName || '',
            albumName: r.albumName || '',
            albumId: r.albumId || '',
            coverPath: r.albumCoverPath,
          }
        : null,
      updatedAt: r.updatedAt || new Date(),
    }));
  }

  async getAllListeningUsers(): Promise<ListeningUser[]> {
    const results = await this.drizzle.db
      .select({
        userId: users.id,
        username: users.username,
        name: users.name,
        avatarPath: users.avatarPath,
        isPlaying: playQueues.isPlaying,
        updatedAt: playQueues.updatedAt,
        trackId: tracks.id,
        trackTitle: tracks.title,
        albumId: albums.id,
        albumName: albums.name,
        albumCoverPath: albums.coverArtPath,
        artistName: artists.name,
      })
      .from(playQueues)
      .innerJoin(users, eq(users.id, playQueues.userId))
      .leftJoin(tracks, eq(tracks.id, playQueues.currentTrackId))
      .leftJoin(albums, eq(albums.id, tracks.albumId))
      .leftJoin(artists, eq(artists.id, tracks.artistId))
      .where(eq(playQueues.isPlaying, true))
      .orderBy(desc(playQueues.updatedAt));

    return results.map(r => ({
      id: r.userId,
      username: r.username,
      name: r.name,
      avatarPath: r.avatarPath,
      isPlaying: r.isPlaying || false,
      currentTrack: r.trackId
        ? {
            id: r.trackId,
            title: r.trackTitle || '',
            artistName: r.artistName || '',
            albumName: r.albumName || '',
            albumId: r.albumId || '',
            coverPath: r.albumCoverPath,
          }
        : null,
      updatedAt: r.updatedAt || new Date(),
    }));
  }

  // ============================================
  // Activity Feed operations
  // ============================================

  async getFriendsActivity(userId: string, limit: number = 20): Promise<ActivityItem[]> {
    // Get friend IDs
    const friendResults = await this.drizzle.db
      .select({
        friendId: sql<string>`CASE
          WHEN ${friendships.requesterId} = ${userId} THEN ${friendships.addresseeId}
          ELSE ${friendships.requesterId}
        END`,
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

    if (friendResults.length === 0) return [];

    const friendIds = friendResults.map(f => f.friendId);

    // Get recent playlists from friends (with cover)
    const playlistResults = await this.drizzle.db
      .select({
        id: playlists.id,
        userId: playlists.ownerId,
        name: playlists.name,
        coverImageUrl: playlists.coverImageUrl,
        createdAt: playlists.createdAt,
      })
      .from(playlists)
      .where(
        and(
          inArray(playlists.ownerId, friendIds),
          eq(playlists.public, true),
        ),
      )
      .orderBy(desc(playlists.createdAt))
      .limit(limit);

    // Get recent friendships (became_friends)
    // Only include friendships where at least one user is a friend of the current user
    const friendshipResults = await this.drizzle.db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        updatedAt: friendships.updatedAt,
      })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(
            inArray(friendships.requesterId, friendIds),
            inArray(friendships.addresseeId, friendIds),
          ),
        ),
      )
      .orderBy(desc(friendships.updatedAt))
      .limit(limit);

    // Get recent likes from friends
    const likesResults = await this.drizzle.db
      .select({
        starredAt: userStarred.starredAt,
        starredId: userStarred.starredId,
        starredType: userStarred.starredType,
        likedByUserId: userStarred.userId,
      })
      .from(userStarred)
      .where(
        and(
          inArray(userStarred.userId, friendIds),
          eq(userStarred.sentiment, 'like'),
        ),
      )
      .orderBy(desc(userStarred.starredAt))
      .limit(limit);

    // Get user info for all activities (including both users in friendships)
    const allUserIds = [
      ...new Set([
        ...likesResults.map(l => l.likedByUserId),
        ...playlistResults.map(p => p.userId),
        ...friendshipResults.map(f => f.requesterId),
        ...friendshipResults.map(f => f.addresseeId),
      ]),
    ];

    if (allUserIds.length === 0) return [];

    const userInfos = await this.drizzle.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .where(inArray(users.id, allUserIds));

    const userMap = new Map(userInfos.map(u => [u.id, u]));

    // Get target names for likes (tracks, albums, artists)
    const trackIds = likesResults.filter(l => l.starredType === 'track').map(l => l.starredId);
    const albumIds = likesResults.filter(l => l.starredType === 'album').map(l => l.starredId);
    const artistIds = likesResults.filter(l => l.starredType === 'artist').map(l => l.starredId);

    const targetNames = new Map<string, string>();
    const targetCovers = new Map<string, { albumId: string; coverPath: string | null }>();

    // Fetch track names with album covers
    if (trackIds.length > 0) {
      const trackResults = await this.drizzle.db
        .select({
          id: tracks.id,
          title: tracks.title,
          albumId: tracks.albumId,
          albumCoverPath: albums.coverArtPath,
        })
        .from(tracks)
        .leftJoin(albums, eq(albums.id, tracks.albumId))
        .where(inArray(tracks.id, trackIds));
      trackResults.forEach(t => {
        targetNames.set(`track-${t.id}`, t.title || 'Canción');
        if (t.albumId && t.albumCoverPath) {
          targetCovers.set(`track-${t.id}`, { albumId: t.albumId, coverPath: t.albumCoverPath });
        }
      });
    }

    // Fetch album names with covers
    if (albumIds.length > 0) {
      const albumResults = await this.drizzle.db
        .select({ id: albums.id, name: albums.name, coverPath: albums.coverArtPath })
        .from(albums)
        .where(inArray(albums.id, albumIds));
      albumResults.forEach(a => {
        targetNames.set(`album-${a.id}`, a.name || 'Álbum');
        if (a.coverPath) {
          targetCovers.set(`album-${a.id}`, { albumId: a.id, coverPath: a.coverPath });
        }
      });
    }

    // Fetch artist names
    if (artistIds.length > 0) {
      const artistResults = await this.drizzle.db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(inArray(artists.id, artistIds));
      artistResults.forEach(a => targetNames.set(`artist-${a.id}`, a.name || 'Artista'));
    }

    // Fetch up to 4 unique album IDs for each playlist (for mosaic cover)
    const playlistAlbumIds = new Map<string, string[]>();
    const playlistIdsNeedingCover = playlistResults
      .filter(p => !p.coverImageUrl)
      .map(p => p.id);

    if (playlistIdsNeedingCover.length > 0) {
      // Get all tracks for playlists, ordered by trackOrder to get albums in order
      const playlistTracksData = await this.drizzle.db
        .select({
          playlistId: playlistTracks.playlistId,
          albumId: tracks.albumId,
          trackOrder: playlistTracks.trackOrder,
        })
        .from(playlistTracks)
        .innerJoin(tracks, eq(tracks.id, playlistTracks.trackId))
        .where(inArray(playlistTracks.playlistId, playlistIdsNeedingCover))
        .orderBy(playlistTracks.playlistId, playlistTracks.trackOrder);

      // Group by playlist and get up to 4 unique album IDs per playlist
      for (const t of playlistTracksData) {
        if (!t.albumId) continue;

        const existing = playlistAlbumIds.get(t.playlistId) || [];
        // Only add if unique and we have less than 4
        if (!existing.includes(t.albumId) && existing.length < 4) {
          existing.push(t.albumId);
          playlistAlbumIds.set(t.playlistId, existing);
        }
      }
    }

    // Build activity items
    const activities: ActivityItem[] = [];

    // Add playlist activities (with cover)
    for (const p of playlistResults) {
      const user = userMap.get(p.userId);
      if (user) {
        // Get album IDs for mosaic (up to 4 unique albums)
        const albumIds = playlistAlbumIds.get(p.id) || [];

        activities.push({
          id: `playlist-${p.id}`,
          userId: p.userId,
          username: user.username,
          userName: user.name,
          userAvatarPath: user.avatarPath,
          actionType: 'created_playlist',
          targetType: 'playlist',
          targetId: p.id,
          targetName: p.name,
          targetCoverPath: p.coverImageUrl || null, // Custom cover if set
          targetAlbumIds: albumIds, // For mosaic cover
          createdAt: p.createdAt,
        });
      }
    }

    // Add like activities
    for (const l of likesResults) {
      const user = userMap.get(l.likedByUserId);
      if (user) {
        const targetKey = `${l.starredType}-${l.starredId}`;
        const coverInfo = targetCovers.get(targetKey);
        activities.push({
          id: `like-${l.starredId}-${l.starredType}`,
          userId: l.likedByUserId,
          username: user.username,
          userName: user.name,
          userAvatarPath: user.avatarPath,
          actionType: `liked_${l.starredType}` as ActivityItem['actionType'],
          targetType: l.starredType,
          targetId: l.starredId,
          targetName: targetNames.get(targetKey) || '',
          targetCoverPath: coverInfo?.coverPath || null,
          targetAlbumId: coverInfo?.albumId,
          createdAt: l.starredAt,
        });
      }
    }

    // Add became_friends activities
    for (const f of friendshipResults) {
      const requester = userMap.get(f.requesterId);
      const addressee = userMap.get(f.addresseeId);
      if (requester && addressee) {
        activities.push({
          id: `friendship-${f.id}`,
          userId: f.requesterId,
          username: requester.username,
          userName: requester.name,
          userAvatarPath: requester.avatarPath,
          actionType: 'became_friends',
          targetType: 'user',
          targetId: f.addresseeId,
          targetName: addressee.username,
          secondUserId: f.addresseeId,
          secondUserName: addressee.name,
          secondUserAvatarPath: addressee.avatarPath,
          createdAt: f.updatedAt,
        });
      }
    }

    // Sort by date and limit
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================
  // User search
  // ============================================

  async searchUsers(
    query: string,
    currentUserId: string,
    limit: number = 10,
  ): Promise<{
    id: string;
    username: string;
    name: string | null;
    avatarPath: string | null;
    friendshipStatus: FriendshipStatus | null;
  }[]> {
    const searchPattern = `%${query}%`;

    const results = await this.drizzle.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .where(
        and(
          ne(users.id, currentUserId),
          eq(users.isActive, true),
          or(
            ilike(users.username, searchPattern),
            ilike(users.name, searchPattern),
          ),
        ),
      )
      .limit(limit);

    if (results.length === 0) {
      return [];
    }

    // Get friendship status for each user
    const userIds = results.map(u => u.id);
    const friendshipResults = await this.drizzle.db
      .select({
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        status: friendships.status,
      })
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, currentUserId),
            inArray(friendships.addresseeId, userIds),
          ),
          and(
            eq(friendships.addresseeId, currentUserId),
            inArray(friendships.requesterId, userIds),
          ),
        ),
      );

    const friendshipMap = new Map<string, FriendshipStatus>();
    for (const f of friendshipResults) {
      const otherId = f.requesterId === currentUserId ? f.addresseeId : f.requesterId;
      friendshipMap.set(otherId, f.status as FriendshipStatus);
    }

    return results.map(u => ({
      ...u,
      friendshipStatus: friendshipMap.get(u.id) || null,
    }));
  }

  // ============================================
  // Helper methods
  // ============================================

  private mapFriendship(raw: typeof friendships.$inferSelect): Friendship {
    return {
      id: raw.id,
      requesterId: raw.requesterId,
      addresseeId: raw.addresseeId,
      status: raw.status as FriendshipStatus,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
