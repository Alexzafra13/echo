import {
  IsString,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Request DTOs
// ============================================

export class SendFriendRequestDto {
  @ApiProperty({
    description: 'ID of the user to send a friend request to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  addresseeId!: string;
}

export class FriendshipIdParamDto {
  @ApiProperty({
    description: 'ID of the friendship',
    example: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  friendshipId!: string;
}

export class SearchUsersQueryDto {
  @ApiProperty({ description: 'Search query string', example: 'john', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  q!: string;

  @ApiPropertyOptional({ description: 'Maximum number of results to return', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ActivityQueryDto {
  @ApiPropertyOptional({ description: 'Maximum number of activity items to return', example: 20 })
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
  @ApiProperty({ description: 'User ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ description: 'Username', example: 'johndoe' })
  username!: string;

  @ApiProperty({ description: 'Display name of the user', example: 'John Doe', nullable: true })
  name!: string | null;

  @ApiProperty({
    description: 'URL of the user avatar',
    example: 'https://cdn.echo.app/avatars/johndoe.png',
    nullable: true,
  })
  avatarUrl!: string | null;
}

export class FriendResponseDto extends UserBasicResponseDto {
  @ApiProperty({ description: 'Whether the user has a public profile', example: true })
  isPublicProfile!: boolean;

  @ApiProperty({
    description: 'ID of the friendship',
    example: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
  })
  friendshipId!: string;

  @ApiProperty({
    description: 'Date when the friendship was established',
    example: '2025-03-10T08:00:00.000Z',
  })
  friendsSince!: Date;
}

export class FriendshipResponseDto {
  @ApiProperty({ description: 'Friendship ID', example: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({
    description: 'ID of the user who sent the request',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  requesterId!: string;

  @ApiProperty({
    description: 'ID of the user who received the request',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  addresseeId!: string;

  @ApiProperty({ description: 'Current status of the friendship', example: 'accepted' })
  status!: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2025-03-10T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-03-10T09:00:00.000Z' })
  updatedAt!: Date;
}

export class PendingRequestsResponseDto {
  @ApiProperty({ description: 'Received friend requests', type: [FriendResponseDto] })
  received!: FriendResponseDto[];

  @ApiProperty({ description: 'Sent friend requests', type: [FriendResponseDto] })
  sent!: FriendResponseDto[];

  @ApiProperty({ description: 'Total count of pending requests', example: 3 })
  count!: number;
}

export class ListeningTrackDto {
  @ApiProperty({ description: 'Track ID', example: 'track-abc-123' })
  id!: string;

  @ApiProperty({ description: 'Track title', example: 'Bohemian Rhapsody' })
  title!: string;

  @ApiProperty({ description: 'Artist name', example: 'Queen' })
  artistName!: string;

  @ApiProperty({ description: 'Album name', example: 'A Night at the Opera' })
  albumName!: string;

  @ApiProperty({ description: 'Album ID', example: 'album-xyz-789' })
  albumId!: string;

  @ApiProperty({
    description: 'Album cover URL',
    example: 'https://cdn.echo.app/covers/album-xyz.jpg',
    nullable: true,
  })
  coverUrl!: string | null;
}

export class ListeningUserResponseDto extends UserBasicResponseDto {
  @ApiProperty({ description: 'Whether the user is currently playing a track', example: true })
  isPlaying!: boolean;

  @ApiProperty({
    description: 'Currently playing track, or null if not listening',
    type: ListeningTrackDto,
    nullable: true,
  })
  currentTrack!: ListeningTrackDto | null;

  @ApiProperty({
    description: 'Last update timestamp for listening status',
    example: '2025-03-10T14:30:00.000Z',
  })
  updatedAt!: Date;
}

export class ActivityItemResponseDto {
  @ApiProperty({ description: 'Activity item ID', example: 'act-a1b2c3d4' })
  id!: string;

  @ApiProperty({ description: 'User who performed the action', type: UserBasicResponseDto })
  user!: UserBasicResponseDto;

  @ApiProperty({ description: 'Type of action performed', example: 'played' })
  actionType!: string;

  @ApiProperty({ description: 'Type of target entity', example: 'track' })
  targetType!: string;

  @ApiProperty({ description: 'ID of the target entity', example: 'track-abc-123' })
  targetId!: string;

  @ApiProperty({ description: 'Display name of the target entity', example: 'Bohemian Rhapsody' })
  targetName!: string;

  @ApiPropertyOptional({
    description: 'Extra info about the target (e.g. artist name)',
    example: 'Queen',
  })
  targetExtra?: string;

  @ApiPropertyOptional({
    description: 'Cover image URL for the target',
    example: 'https://cdn.echo.app/covers/album-xyz.jpg',
    nullable: true,
  })
  targetCoverUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Album ID for track targets, used for navigation',
    example: 'album-xyz-789',
  })
  targetAlbumId?: string;

  @ApiPropertyOptional({
    description: 'Up to 4 album IDs for playlist mosaic cover',
    example: ['album-1', 'album-2', 'album-3', 'album-4'],
    type: [String],
  })
  targetAlbumIds?: string[];

  @ApiPropertyOptional({
    description: 'Second user involved in the action (e.g. became_friends)',
    type: UserBasicResponseDto,
  })
  secondUser?: UserBasicResponseDto;

  @ApiProperty({
    description: 'Timestamp when the activity occurred',
    example: '2025-03-10T14:30:00.000Z',
  })
  createdAt!: Date;
}

export class SearchUserResultDto extends UserBasicResponseDto {
  @ApiProperty({
    description: 'Friendship status with the searching user',
    example: 'accepted',
    nullable: true,
  })
  friendshipStatus!: string | null;
}

export class SocialOverviewResponseDto {
  @ApiProperty({ description: 'List of friends', type: [FriendResponseDto] })
  friends!: FriendResponseDto[];

  @ApiProperty({ description: 'Pending friend requests', type: PendingRequestsResponseDto })
  pendingRequests!: PendingRequestsResponseDto;

  @ApiProperty({
    description: 'Users currently listening to music',
    type: [ListeningUserResponseDto],
  })
  listeningNow!: ListeningUserResponseDto[];

  @ApiProperty({ description: 'Recent activity feed', type: [ActivityItemResponseDto] })
  recentActivity!: ActivityItemResponseDto[];
}
