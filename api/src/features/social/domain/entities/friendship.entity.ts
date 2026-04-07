// ============================================
// Friendship Entity
// ============================================

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendshipWithUser extends Friendship {
  requester: {
    id: string;
    username: string;
    name: string | null;
    avatarPath: string | null;
    avatarUpdatedAt: Date | null;
    isPublicProfile: boolean;
  };
  addressee: {
    id: string;
    username: string;
    name: string | null;
    avatarPath: string | null;
    avatarUpdatedAt: Date | null;
    isPublicProfile: boolean;
  };
}

export interface Friend {
  id: string;
  username: string;
  name: string | null;
  avatarPath: string | null;
  avatarUpdatedAt: Date | null;
  isPublicProfile: boolean;
  friendshipId: string;
  friendsSince: Date;
}

export interface ListeningUser {
  id: string;
  username: string;
  name: string | null;
  avatarPath: string | null;
  avatarUpdatedAt: Date | null;
  isPlaying: boolean;
  currentTrack: {
    id: string;
    title: string;
    artistName: string;
    albumName: string;
    albumId: string;
    coverPath: string | null;
  } | null;
  updatedAt: Date;
}

export interface ActivityItem {
  id: string;
  userId: string;
  username: string;
  userName: string | null;
  userAvatarPath: string | null;
  userAvatarUpdatedAt: Date | null;
  actionType: ActivityType;
  targetType: string;
  targetId: string;
  targetName: string;
  targetExtra?: string; // e.g., artist name for tracks
  targetCoverPath?: string | null; // cover image for playlists/albums
  targetAlbumId?: string; // for tracks: the album ID (to generate cover URL)
  targetAlbumIds?: string[]; // for playlists: up to 4 album IDs for mosaic cover
  secondUserId?: string; // for became_friends: the other user
  secondUserName?: string | null;
  secondUserAvatarPath?: string | null;
  secondUserAvatarUpdatedAt?: Date | null;
  createdAt: Date;
}

export type ActivityType =
  | 'created_playlist'
  | 'liked_track'
  | 'liked_album'
  | 'liked_artist'
  | 'played_track'
  | 'became_friends';
