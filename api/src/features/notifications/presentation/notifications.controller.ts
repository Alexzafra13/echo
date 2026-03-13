import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Observable, map, interval, takeUntil, Subject } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators/public.decorator';
import { NotificationsService } from '../application/notifications.service';
import { NotificationEventsService } from '../application/notification-events.service';
import { NOTIFICATION_TYPES, NotificationType } from '@infrastructure/database/schema';

interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectPinoLogger(NotificationsController.name)
    private readonly logger: PinoLogger,
    private readonly notificationsService: NotificationsService,
    private readonly notificationEvents: NotificationEventsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar notificaciones del usuario' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @Req() req: FastifyRequest & { user: AuthUser },
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('unreadOnly') unreadOnlyStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    const unreadOnly = unreadOnlyStr === 'true';

    return this.notificationsService.getNotifications(req.user.id, {
      limit,
      offset,
      unreadOnly,
    });
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener contador de no leídas' })
  async getUnreadCount(@Req() req: FastifyRequest & { user: AuthUser }) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async markAsRead(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { user: AuthUser },
  ) {
    await this.notificationsService.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  async markAllAsRead(@Req() req: FastifyRequest & { user: AuthUser }) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar todas las notificaciones' })
  async deleteAll(@Req() req: FastifyRequest & { user: AuthUser }) {
    const deletedCount = await this.notificationsService.deleteAll(req.user.id);
    return { deletedCount };
  }

  // ============================================
  // Preferences
  // ============================================

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener preferencias de notificaciones' })
  async getPreferences(@Req() req: FastifyRequest & { user: AuthUser }) {
    const prefs = await this.notificationsService.getPreferences(req.user.id);

    // Return all types with their enabled state (default true if no preference row)
    const allPrefs = NOTIFICATION_TYPES.map((type) => {
      const pref = prefs.find((p) => p.notificationType === type);
      return {
        notificationType: type,
        enabled: pref ? pref.enabled : true,
      };
    });

    return { preferences: allPrefs };
  }

  @Put('preferences/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar preferencia de notificación' })
  async updatePreference(
    @Param('type') type: NotificationType,
    @Body() body: { enabled: boolean },
    @Req() req: FastifyRequest & { user: AuthUser },
  ) {
    await this.notificationsService.updatePreference(
      req.user.id,
      type,
      body.enabled,
    );
    return { success: true };
  }

  // ============================================
  // SSE Stream
  // ============================================

  @Sse('stream')
  @Public()
  @ApiOperation({ summary: 'Stream de notificaciones en tiempo real (SSE)' })
  streamNotifications(
    @Query('token') token: string,
    @Req() request: FastifyRequest,
  ): Observable<MessageEvent> {
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.userId;
    } catch {
      this.logger.warn('SSE notification connection rejected: invalid token');
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          data: { message: 'Invalid or expired token' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    this.logger.debug({ userId }, 'SSE notification connection established');

    const disconnect$ = new Subject<void>();

    // Handle client disconnect
    request.raw.on('close', () => {
      this.logger.debug({ userId }, 'SSE notification connection closed');
      disconnect$.next();
      disconnect$.complete();
      this.notificationEvents.removeUser(userId);
    });

    // Merge notification events with keepalive
    const notificationStream = this.notificationEvents
      .getUserStream(userId)
      .pipe(
        takeUntil(disconnect$),
        map(
          (evt) =>
            ({
              type: evt.event,
              data: evt.data,
            }) as MessageEvent,
        ),
      );

    // Send keepalive every 30 seconds
    const keepalive = interval(30000).pipe(
      takeUntil(disconnect$),
      map(
        () =>
          ({
            type: 'keepalive',
            data: { timestamp: Date.now() },
          }) as MessageEvent,
      ),
    );

    return new Observable((subscriber) => {
      // Send initial connected event
      subscriber.next({
        type: 'connected',
        data: { userId, timestamp: Date.now() },
      } as MessageEvent);

      const notifSub = notificationStream.subscribe(subscriber);
      const keepaliveSub = keepalive.subscribe((evt) => subscriber.next(evt));

      return () => {
        notifSub.unsubscribe();
        keepaliveSub.unsubscribe();
      };
    });
  }
}
