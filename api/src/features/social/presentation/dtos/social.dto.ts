import { IsString, IsUUID, IsOptional, MinLength, MaxLength, IsInt, Min, Max } from 'class-validator';

// ============================================
// Request DTOs
// ============================================

export class SendFriendRequestDto {
  @IsUUID()
  addresseeId!: string;
}

export class FriendshipIdParamDto {
  @IsUUID()
  friendshipId!: string;
}

export class SearchUsersQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  q!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ActivityQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// Response DTOs
// ============================================

export class UserBasicResponseDto {
  id!: string;
  username!: string;
  name!: string | null;
  avatarUrl!: string | null;
}

export class FriendResponseDto extends UserBasicResponseDto {
  isPublicProfile!: boolean;
  friendshipId!: string;
  friendsSince!: Date;
}

export class FriendshipResponseDto {
  id!: string;
  requesterId!: string;
  addresseeId!: string;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PendingRequestsResponseDto {
  received!: FriendResponseDto[];
  sent!: FriendResponseDto[];
  count!: number;
}

export class ListeningTrackDto {
  id!: string;
  title!: string;
  artistName!: string;
  albumName!: string;
  albumId!: string;
  coverUrl!: string | null;
}

export class ListeningUserResponseDto extends UserBasicResponseDto {
  isPlaying!: boolean;
  currentTrack!: ListeningTrackDto | null;
  updatedAt!: Date;
}

export class ActivityItemResponseDto {
  id!: string;
  user!: UserBasicResponseDto;
  actionType!: string;
  targetType!: string;
  targetId!: string;
  targetName!: string;
  targetExtra?: string;
  targetCoverUrl?: string | null;
  targetAlbumId?: string; // for tracks: the album ID for navigation
  targetAlbumIds?: string[]; // for playlists: up to 4 album IDs for mosaic cover
  secondUser?: UserBasicResponseDto; // for became_friends: the other user
  createdAt!: Date;
}

export class SearchUserResultDto extends UserBasicResponseDto {
  friendshipStatus!: string | null;
}

export class SocialOverviewResponseDto {
  friends!: FriendResponseDto[];
  pendingRequests!: PendingRequestsResponseDto;
  listeningNow!: ListeningUserResponseDto[];
  recentActivity!: ActivityItemResponseDto[];
}
