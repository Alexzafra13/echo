import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RequestWithUser } from '@shared/types/request.types';
import {
  InviteCollaboratorUseCase,
  AcceptCollaborationUseCase,
  RemoveCollaboratorUseCase,
  GetCollaboratorsUseCase,
  UpdateCollaboratorRoleUseCase,
} from '../../domain/use-cases';
import {
  InviteCollaboratorDto,
  UpdateCollaboratorRoleDto,
  CollaboratorResponseDto,
  CollaboratorsListResponseDto,
} from '../dto';

@ApiTags('playlist-collaborators')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class CollaboratorsController {
  constructor(
    private readonly inviteCollaboratorUseCase: InviteCollaboratorUseCase,
    private readonly acceptCollaborationUseCase: AcceptCollaborationUseCase,
    private readonly removeCollaboratorUseCase: RemoveCollaboratorUseCase,
    private readonly getCollaboratorsUseCase: GetCollaboratorsUseCase,
    private readonly updateCollaboratorRoleUseCase: UpdateCollaboratorRoleUseCase,
  ) {}

  @Post(':id/collaborators')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a collaborator to a playlist' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Invitation sent' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only owner can invite' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Already a collaborator' })
  async inviteCollaborator(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Body() dto: InviteCollaboratorDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.inviteCollaboratorUseCase.execute({
      playlistId,
      targetUserId: dto.userId,
      role: dto.role,
      inviterId: req.user.id,
    });
    return result;
  }

  @Get(':id/collaborators')
  @ApiOperation({ summary: 'Get collaborators for a playlist' })
  @ApiResponse({ status: HttpStatus.OK, type: CollaboratorsListResponseDto })
  async getCollaborators(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Req() req: RequestWithUser,
  ): Promise<CollaboratorsListResponseDto> {
    const result = await this.getCollaboratorsUseCase.execute({
      playlistId,
      requesterId: req.user.id,
    });
    return CollaboratorsListResponseDto.fromDomain(result);
  }

  @Post('collaborations/:collaborationId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a collaboration invitation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Collaboration accepted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the invited user' })
  async acceptCollaboration(
    @Param('collaborationId', ParseUUIDPipe) collaborationId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.acceptCollaborationUseCase.execute({
      collaborationId,
      userId: req.user.id,
    });
  }

  @Patch(':id/collaborators/:userId/role')
  @ApiOperation({ summary: 'Update a collaborator role' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only owner can change roles' })
  async updateCollaboratorRole(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateCollaboratorRoleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.updateCollaboratorRoleUseCase.execute({
      playlistId,
      targetUserId: userId,
      role: dto.role,
      requesterId: req.user.id,
    });
  }

  @Delete(':id/collaborators/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a collaborator from a playlist' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Collaborator removed' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async removeCollaborator(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.removeCollaboratorUseCase.execute({
      playlistId,
      targetUserId: userId,
      requesterId: req.user.id,
    });
  }
}
