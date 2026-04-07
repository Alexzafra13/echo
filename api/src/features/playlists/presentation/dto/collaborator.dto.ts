import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import {
  CollaboratorItem,
  GetCollaboratorsOutput,
} from '../../domain/use-cases/get-collaborators/get-collaborators.dto';

export class InviteCollaboratorDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ enum: ['editor', 'viewer'], example: 'editor' })
  @IsEnum(['editor', 'viewer'])
  role!: 'editor' | 'viewer';
}

export class UpdateCollaboratorRoleDto {
  @ApiProperty({ enum: ['editor', 'viewer'], example: 'editor' })
  @IsEnum(['editor', 'viewer'])
  role!: 'editor' | 'viewer';
}

export class CollaboratorResponseDto {
  @ApiProperty({
    description: 'Unique collaborator record ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the playlist',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  playlistId!: string;

  @ApiProperty({
    description: 'ID of the collaborating user',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  userId!: string;

  @ApiPropertyOptional({ description: 'Username of the collaborator', example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ description: 'Display name of the collaborator', example: 'John Doe' })
  name?: string;

  @ApiPropertyOptional({ description: 'Whether the collaborator has an avatar', example: true })
  hasAvatar?: boolean;

  @ApiProperty({
    description: 'Role of the collaborator in the playlist',
    example: 'editor',
    enum: ['editor', 'viewer'],
  })
  role!: string;

  @ApiProperty({
    description: 'Invitation status',
    example: 'accepted',
    enum: ['pending', 'accepted', 'rejected'],
  })
  status!: string;

  @ApiProperty({
    description: 'ID of the user who sent the invitation',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  invitedBy!: string;

  @ApiProperty({
    description: 'Date when the collaborator was invited',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  static fromItem(item: CollaboratorItem): CollaboratorResponseDto {
    return {
      id: item.id,
      playlistId: item.playlistId,
      userId: item.userId,
      username: item.username,
      name: item.name,
      hasAvatar: item.hasAvatar,
      role: item.role,
      status: item.status,
      invitedBy: item.invitedBy,
      createdAt: item.createdAt,
    };
  }
}

export class CollaboratorsListResponseDto {
  @ApiProperty({
    description: 'ID of the playlist',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  playlistId!: string;

  @ApiProperty({
    description: 'List of collaborators in the playlist',
    type: [CollaboratorResponseDto],
  })
  collaborators!: CollaboratorResponseDto[];

  static fromDomain(output: GetCollaboratorsOutput): CollaboratorsListResponseDto {
    return {
      playlistId: output.playlistId,
      collaborators: output.collaborators.map(CollaboratorResponseDto.fromItem),
    };
  }
}
