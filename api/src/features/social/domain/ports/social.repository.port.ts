import {
  Friendship,
  FriendshipStatus,
  Friend,
  ListeningUser,
  ActivityItem,
} from '../entities/friendship.entity';

export interface ISocialRepository {
  // ============================================
  // Friendship operations
  // ============================================

  /**
   * Send a friend request from requester to addressee
   */
  sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship>;

  /**
   * Accept a friend request
   */
  acceptFriendRequest(friendshipId: string, userId: string): Promise<Friendship>;

  /**
   * Reject/delete a friend request or friendship
   */
  removeFriendship(friendshipId: string, userId: string): Promise<void>;

  /**
   * Block a user
   */
  blockUser(requesterId: string, addresseeId: string): Promise<Friendship>;

  /**
   * Get a friendship by id
   */
  getFriendshipById(friendshipId: string): Promise<Friendship | null>;

  /**
   * Get friendship between two users (in any direction)
   */
  getFriendshipBetweenUsers(userId1: string, userId2: string): Promise<Friendship | null>;

  /**
   * Get all friends of a user (accepted friendships)
   */
  getFriends(userId: string): Promise<Friend[]>;

  /**
   * Get pending friend requests received by user
   */
  getPendingRequests(userId: string): Promise<Friend[]>;

  /**
   * Get pending friend requests sent by user
   */
  getSentRequests(userId: string): Promise<Friend[]>;

  /**
   * Count pending requests for a user
   */
  countPendingRequests(userId: string): Promise<number>;

  // ============================================
  // Listening Now operations
  // ============================================

  /**
   * Get users who are currently listening (friends only)
   */
  getListeningFriends(userId: string): Promise<ListeningUser[]>;

  /**
   * Get all users currently listening (for admin or if no friends filter)
   */
  getAllListeningUsers(): Promise<ListeningUser[]>;

  // ============================================
  // Activity Feed operations
  // ============================================

  /**
   * Get activity feed for a user's friends
   */
  getFriendsActivity(userId: string, limit?: number): Promise<ActivityItem[]>;

  // ============================================
  // User search
  // ============================================

  /**
   * Search users by username or name (for adding friends)
   */
  searchUsers(query: string, currentUserId: string, limit?: number): Promise<{
    id: string;
    username: string;
    name: string | null;
    avatarPath: string | null;
    friendshipStatus: FriendshipStatus | null;
  }[]>;
}

export const SOCIAL_REPOSITORY = Symbol('SOCIAL_REPOSITORY');
