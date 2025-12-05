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
 * Helper function to generate avatar URL from path
 */
function getAvatarUrl(userId: string, avatarPath: string | null): string | null {
  if (!avatarPath) return null;
  return `/api/users/${userId}/avatar`;
}

/**
 * Helper function to generate album cover URL from path
 */
function getCoverUrl(albumId: string, coverPath: string | null): string | null {
  if (!coverPath) return null;
  return `/api/albums/${albumId}/cover`;
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
      avatarUrl: getAvatarUrl(friend.id, friend.avatarPath),
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
      avatarUrl: getAvatarUrl(user.id, user.avatarPath),
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
    return {
      id: activity.id,
      user: {
        id: activity.userId,
        username: activity.username,
        name: activity.userName,
        avatarUrl: getAvatarUrl(activity.userId, activity.userAvatarPath),
      },
      actionType: activity.actionType,
      targetType: activity.targetType,
      targetId: activity.targetId,
      targetName: activity.targetName,
      targetExtra: activity.targetExtra,
      createdAt: activity.createdAt,
    };
  }

  static toSearchUserResult(user: {
    id: string;
    username: string;
    name: string | null;
    avatarPath: string | null;
    friendshipStatus: string | null;
  }): SearchUserResultDto {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: getAvatarUrl(user.id, user.avatarPath),
      friendshipStatus: user.friendshipStatus,
    };
  }
}
