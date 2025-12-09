import {
  Controller,
  Query,
  Sse,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { Public } from '@shared/decorators/public.decorator';
import { SocialEventsService, SocialEvent } from '../../domain/services/social-events.service';

/**
 * SocialEventsController
 * SSE endpoint for real-time social notifications (friend requests)
 */
@Controller('social')
export class SocialEventsController {
  constructor(
    private readonly socialEventsService: SocialEventsService,
  ) {}

  /**
   * GET /social/notifications/stream
   * Server-Sent Events endpoint for real-time social notifications
   * Streams friend request received and accepted events
   *
   * Note: EventSource cannot send Authorization headers, so this endpoint
   * is public but requires userId as query parameter.
   */
  @Sse('notifications/stream')
  @Public()
  streamNotifications(
    @Query('userId') userId: string,
    @Req() request: FastifyRequest,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      if (!userId) {
        subscriber.complete();
        return;
      }

      // Subscribe to social events for this user
      const handleEvent = (event: SocialEvent) => {
        subscriber.next({
          type: event.type,
          data: event.data,
        } as MessageEvent);
      };

      const unsubscribe = this.socialEventsService.subscribe(userId, handleEvent);

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        subscriber.next({
          type: 'keepalive',
          data: { timestamp: Date.now() },
        } as MessageEvent);
      }, 30000);

      // Send initial "connected" event
      subscriber.next({
        type: 'connected',
        data: { userId, timestamp: Date.now() },
      } as MessageEvent);

      // Cleanup on client disconnect
      request.raw.on('close', () => {
        unsubscribe();
        clearInterval(keepaliveInterval);
        subscriber.complete();
      });
    });
  }
}
