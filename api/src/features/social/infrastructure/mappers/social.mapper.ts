import {
  Friendship,
  Friend,
  ListeningUser,
  ActivityItem,
} from '../../domain/entities/friendship.entity';
import {
  FriendshipResponseDto,
  FriendResponseDto,
  ListeningUserResponseDto,
  ActivityItemResponseDto,
  SearchUserResultDto,
} from '../../presentation/dtos/social.dto';

/**
 * Helper function to generate avatar URL from path.
 * Includes avatarUpdatedAt as cache-buster to prevent stale browser cache.
 */
function getAvatarUrl(userId: string, avatarPath: string | null, avatarUpdatedAt?: Date | null): string | null {
  if (!avatarPath) return null;
  const base = `/api/images/users/${userId}/avatar`;
  return avatarUpdatedAt ? `${base}?v=${avatarUpdatedAt.getTime()}` : base;
}

/**
 * Helper function to generate album cover URL from path
 */
function getCoverUrl(albumId: string, coverPath: string | null): string | null {
  if (!coverPath) return null;
  return `/api/albums/${albumId}/cover`;
}

/**
 * Helper function to generate playlist cover URL
 */
function getPlaylistCoverUrl(playlistId: string, coverUrl: string | null): string | null {
  if (!coverUrl) return null;
  // If it's already a full URL, return as-is
  if (coverUrl.startsWith('http')) return coverUrl;
  return `/api/playlists/${playlistId}/cover`;
}

export class SocialMapper {
  static toFriendshipResponse(friendship: Friendship): FriendshipResponseDto {
    return {
      id: friendship.id,
      requesterId: friendship.requesterId,
      addresseeId: friendship.addresseeId,
      status: friendship.status,
      createdAt: friendship.createdAt,
      updatedAt: friendship.updatedAt,
    };
  }

  static toFriendResponse(friend: Friend): FriendResponseDto {
    return {
      id: friend.id,
      username: friend.username,
      name: friend.name,
      avatarUrl: getAvatarUrl(friend.id, friend.avatarPath, friend.avatarUpdatedAt),
      isPublicProfile: friend.isPublicProfile,
      friendshipId: friend.friendshipId,
      friendsSince: friend.friendsSince,
    };
  }

  static toListeningUserResponse(user: ListeningUser): ListeningUserResponseDto {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: getAvatarUrl(user.id, user.avatarPath, user.avatarUpdatedAt),
      isPlaying: user.isPlaying,
      currentTrack: user.currentTrack
        ? {
            id: user.currentTrack.id,
            title: user.currentTrack.title,
            artistName: user.currentTrack.artistName,
            albumName: user.currentTrack.albumName,
            albumId: user.currentTrack.albumId,
            coverUrl: getCoverUrl(user.currentTrack.albumId, user.currentTrack.coverPath),
          }
        : null,
      updatedAt: user.updatedAt,
    };
  }

  static toActivityItemResponse(activity: ActivityItem): ActivityItemResponseDto {
    // Determine cover URL based on target type
    let targetCoverUrl: string | null = null;
    if (activity.targetCoverPath) {
      if (activity.targetType === 'playlist') {
        // For playlists with multiple albums, frontend uses targetAlbumIds for mosaic
        // Only set targetCoverUrl if no albumIds available (fallback)
        if (!activity.targetAlbumIds || activity.targetAlbumIds.length === 0) {
          if (activity.targetAlbumId) {
            targetCoverUrl = getCoverUrl(activity.targetAlbumId, activity.targetCoverPath);
          } else {
            targetCoverUrl = getPlaylistCoverUrl(activity.targetId, activity.targetCoverPath);
          }
        }
      } else if (activity.targetType === 'album') {
        targetCoverUrl = getCoverUrl(activity.targetId, activity.targetCoverPath);
      } else if (activity.targetType === 'track' && activity.targetAlbumId) {
        // For tracks, use the album ID to generate cover URL
        targetCoverUrl = getCoverUrl(activity.targetAlbumId, activity.targetCoverPath);
      }
    }

    const result: ActivityItemResponseDto = {
      id: activity.id,
      user: {
        id: activity.userId,
        username: activity.username,
        name: activity.userName,
        avatarUrl: getAvatarUrl(activity.userId, activity.userAvatarPath, activity.userAvatarUpdatedAt),
      },
      actionType: activity.actionType,
      targetType: activity.targetType,
      targetId: activity.targetId,
      targetName: activity.targetName,
      targetExtra: activity.targetExtra,
      targetCoverUrl,
      targetAlbumId: activity.targetAlbumId,
      targetAlbumIds: activity.targetAlbumIds,
      createdAt: activity.createdAt,
    };

    // Add second user for became_friends activities
    if (activity.actionType === 'became_friends' && activity.secondUserId) {
      result.secondUser = {
        id: activity.secondUserId,
        username: activity.targetName, // targetName stores second user's username
        name: activity.secondUserName || null,
        avatarUrl: getAvatarUrl(activity.secondUserId, activity.secondUserAvatarPath || null, activity.secondUserAvatarUpdatedAt),
      };
    }

    return result;
  }

  static toSearchUserResult(user: {
    id: string;
    username: string;
    name: string | null;
    avatarPath: string | null;
    avatarUpdatedAt?: Date | null;
    friendshipStatus: string | null;
  }): SearchUserResultDto {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: getAvatarUrl(user.id, user.avatarPath, user.avatarUpdatedAt),
      friendshipStatus: user.friendshipStatus,
    };
  }
}
