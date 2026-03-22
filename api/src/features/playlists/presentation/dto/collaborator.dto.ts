import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { CollaboratorItem, GetCollaboratorsOutput } from '../../domain/use-cases/get-collaborators/get-collaborators.dto';

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
  @ApiProperty() id!: string;
  @ApiProperty() playlistId!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() username?: string;
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() hasAvatar?: boolean;
  @ApiProperty() role!: string;
  @ApiProperty() status!: string;
  @ApiProperty() invitedBy!: string;
  @ApiProperty() createdAt!: Date;

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
  @ApiProperty() playlistId!: string;
  @ApiProperty({ type: [CollaboratorResponseDto] })
  collaborators!: CollaboratorResponseDto[];

  static fromDomain(output: GetCollaboratorsOutput): CollaboratorsListResponseDto {
    return {
      playlistId: output.playlistId,
      collaborators: output.collaborators.map(CollaboratorResponseDto.fromItem),
    };
  }
}
