import {
  Controller,
  Get,
  Post,
  Patch,
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
import { SessionCleanupService } from '../../infrastructure/services/session-cleanup.service';
import { NotificationsService } from '@features/notifications/application/notifications.service';

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
    private readonly cleanupService: SessionCleanupService,
    private readonly notificationsService: NotificationsService,
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
    const result = await this.createSessionUseCase.execute({
      hostId: req.user.id,
      name: dto.name,
    });
    // Programar auto-cierre por inactividad
    await this.cleanupService.scheduleInactivityTimeout(result.id);
    return result;
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a listening session by invite code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Joined session' })
  async joinSession(
    @Body() dto: JoinSessionDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.joinSessionUseCase.execute({
      inviteCode: dto.inviteCode,
      userId: req.user.id,
    });
    // Actividad: resetear timer
    await this.cleanupService.resetInactivityTimeout(result.sessionId);
    return result;
  }

  @Get('my-active')
  @ApiOperation({ summary: 'Get current user active session (as host or participant)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active session or null' })
  async getMyActiveSession(@Req() req: RequestWithUser) {
    try {
      const session = await this.getSessionUseCase.findActiveForUser(req.user.id);
      if (!session) return null;
      return this.getSessionUseCase.execute({
        sessionId: session.id,
        userId: req.user.id,
      });
    } catch {
      return null;
    }
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
  async addToQueue(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: AddToQueueDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.addToQueueUseCase.execute({
      sessionId,
      trackId: dto.trackId,
      userId: req.user.id,
    });
    // Actividad: resetear timer
    await this.cleanupService.resetInactivityTimeout(sessionId);
    return result;
  }

  @Post(':id/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip to the next track in the queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Skipped to next track' })
  async skipTrack(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.skipTrackUseCase.execute({
      sessionId,
      userId: req.user.id,
    });
    // Actividad: resetear timer
    await this.cleanupService.resetInactivityTimeout(sessionId);
    return result;
  }

  @Patch(':id/participants/:userId/role')
  @ApiOperation({ summary: 'Update a participant role' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role updated' })
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

  @Post(':id/invite/:friendId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invite a friend to the listening session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invitation sent' })
  async inviteFriend(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Req() req: RequestWithUser,
  ) {
    const session = await this.getSessionUseCase.execute({
      sessionId,
      userId: req.user.id,
    });

    // Usa 'session_invite' si la BD esta sincronizada (db:push), si no 'new_content'
    const notificationType = 'session_invite' as const;
    await this.notificationsService.notify(
      friendId,
      notificationType,
      'Te han invitado a escuchar',
      `${req.user.username} te invita a la sesion "${session.name}"`,
      { sessionId, inviteCode: session.inviteCode, invitedBy: req.user.id },
    ).catch(() => {
      // Fallback si el tipo no existe en la BD
      return this.notificationsService.notify(
        friendId,
        'new_content',
        'Te han invitado a escuchar',
        `${req.user.username} te invita a la sesion "${session.name}"`,
        { sessionId, inviteCode: session.inviteCode, invitedBy: req.user.id },
      );
    });

    return { message: 'Invitacion enviada', sessionId, friendId };
  }

  @Post(':id/queue/:queueItemId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a track from session queue (host only)' })
  async removeFromQueue(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('queueItemId', ParseUUIDPipe) queueItemId: string,
    @Req() req: RequestWithUser,
  ) {
    const session = await this.getSessionUseCase.execute({ sessionId, userId: req.user.id });
    if (session.hostId !== req.user.id) {
      throw new Error('Only the host can remove tracks from the queue');
    }
    const repo = (this as any).getSessionUseCase['sessionRepository'];
    await repo.removeFromQueue(sessionId, queueItemId);
    return { message: 'Track removed from queue' };
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update session settings (host only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Settings updated' })
  async updateSettings(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: { guestsCanControl?: boolean },
    @Req() req: RequestWithUser,
  ) {
    const session = await this.getSessionUseCase.execute({
      sessionId,
      userId: req.user.id,
    });
    if (session.hostId !== req.user.id) {
      throw new Error('Only the host can change settings');
    }
    // Actualizar via repositorio directamente
    const repo = (this as any).getSessionUseCase['sessionRepository'];
    const entity = await repo.findById(sessionId);
    if (entity && dto.guestsCanControl !== undefined) {
      entity['props'].guestsCanControl = dto.guestsCanControl;
      await repo.update(sessionId, entity);
    }
    return { guestsCanControl: dto.guestsCanControl };
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a listening session' })
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
  async endSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.endSessionUseCase.execute({
      sessionId,
      userId: req.user.id,
    });
    // Limpiar todos los jobs programados de esta sesion
    await this.cleanupService.clearSessionJobs(sessionId);
    return result;
  }
}
