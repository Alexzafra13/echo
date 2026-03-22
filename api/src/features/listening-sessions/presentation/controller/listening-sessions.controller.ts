import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
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
  CreateSessionUseCase,
  JoinSessionUseCase,
  LeaveSessionUseCase,
  AddToQueueUseCase,
  SkipTrackUseCase,
  GetSessionUseCase,
  EndSessionUseCase,
  UpdateParticipantRoleUseCase,
} from '../../domain/use-cases';
import {
  CreateSessionDto,
  JoinSessionDto,
  AddToQueueDto,
  UpdateParticipantRoleDto,
} from '../dto';

@ApiTags('listening-sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('listening-sessions')
export class ListeningSessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly joinSessionUseCase: JoinSessionUseCase,
    private readonly leaveSessionUseCase: LeaveSessionUseCase,
    private readonly addToQueueUseCase: AddToQueueUseCase,
    private readonly skipTrackUseCase: SkipTrackUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly endSessionUseCase: EndSessionUseCase,
    private readonly updateParticipantRoleUseCase: UpdateParticipantRoleUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new listening session' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Session created' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Already have active session' })
  async createSession(
    @Body() dto: CreateSessionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.createSessionUseCase.execute({
      hostId: req.user.id,
      name: dto.name,
    });
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a listening session by invite code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Joined session' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async joinSession(
    @Body() dto: JoinSessionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.joinSessionUseCase.execute({
      inviteCode: dto.inviteCode,
      userId: req.user.id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details including participants and queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session details' })
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.getSessionUseCase.execute({
      sessionId: id,
      userId: req.user.id,
    });
  }

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Get session by invite code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session details' })
  async getSessionByCode(
    @Param('code') code: string,
    @Req() req: RequestWithUser,
  ) {
    return this.getSessionUseCase.execute({
      inviteCode: code,
      userId: req.user.id,
    });
  }

  @Post(':id/queue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a track to the session queue' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Track added to queue' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to add' })
  async addToQueue(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: AddToQueueDto,
    @Req() req: RequestWithUser,
  ) {
    return this.addToQueueUseCase.execute({
      sessionId,
      trackId: dto.trackId,
      userId: req.user.id,
    });
  }

  @Post(':id/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip to the next track in the queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Skipped to next track' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to skip' })
  async skipTrack(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.skipTrackUseCase.execute({
      sessionId,
      userId: req.user.id,
    });
  }

  @Patch(':id/participants/:userId/role')
  @ApiOperation({ summary: 'Update a participant role (promote to DJ or demote to listener)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only host can change roles' })
  async updateParticipantRole(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateParticipantRoleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.updateParticipantRoleUseCase.execute({
      sessionId,
      targetUserId: userId,
      role: dto.role,
      requesterId: req.user.id,
    });
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a listening session (host leaving ends the session)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Left session' })
  async leaveSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.leaveSessionUseCase.execute({
      sessionId,
      userId: req.user.id,
    });
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a listening session (host only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session ended' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only host can end' })
  async endSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.endSessionUseCase.execute({
      sessionId,
      userId: req.user.id,
    });
  }
}
