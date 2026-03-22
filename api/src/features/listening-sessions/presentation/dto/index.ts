import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ParticipantRole } from '../../domain/entities/listening-session.entity';

// --- Request DTOs ---

export class CreateSessionDto {
  @ApiProperty({ example: 'Friday Night Vibes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

export class JoinSessionDto {
  @ApiProperty({ example: 'ABC123' })
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;
}

export class AddToQueueDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  trackId!: string;
}

export class UpdateParticipantRoleDto {
  @ApiProperty({ enum: ['dj', 'listener'], example: 'dj' })
  @IsEnum(['dj', 'listener'])
  role!: ParticipantRole;
}

// --- Response DTOs ---

export class SessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() hostId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() inviteCode!: string;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional() currentTrackId?: string;
  @ApiProperty() currentPosition!: number;
  @ApiProperty() participants!: ParticipantResponseDto[];
  @ApiProperty() queue!: QueueItemResponseDto[];
  @ApiProperty() createdAt!: Date;
}

export class ParticipantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() username!: string;
  @ApiPropertyOptional() name?: string;
  @ApiProperty() hasAvatar!: boolean;
  @ApiProperty() role!: string;
  @ApiProperty() joinedAt!: Date;
}

export class QueueItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() trackId!: string;
  @ApiProperty() trackTitle!: string;
  @ApiProperty() trackDuration!: number;
  @ApiPropertyOptional() artistName?: string;
  @ApiPropertyOptional() albumName?: string;
  @ApiPropertyOptional() albumId?: string;
  @ApiProperty() addedBy!: string;
  @ApiProperty() addedByUsername!: string;
  @ApiProperty() position!: number;
  @ApiProperty() played!: boolean;
}
