import { Controller, Query, Req, Sse } from '@nestjs/common';
import { Observable, interval, map, takeUntil, merge as rxMerge } from 'rxjs';
import { Subject } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Public } from '@shared/decorators/public.decorator';
import { UnifiedSSEService } from './unified-sse.service';

@Controller('events')
export class UnifiedSSEController {
  constructor(
    private readonly unifiedSSE: UnifiedSSEService,
    private readonly jwtService: JwtService,
    @InjectPinoLogger(UnifiedSSEController.name)
    private readonly logger: PinoLogger
  ) {}

  @Sse('stream')
  @Public()
  streamEvents(
    @Query('token') token: string,
    @Req() request: FastifyRequest
  ): Observable<MessageEvent> {
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.userId;
    } catch {
      this.logger.warn('Unified SSE connection rejected: invalid token');
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          data: { message: 'Invalid or expired token' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    this.logger.debug({ userId }, 'Unified SSE connection established');

    const disconnect$ = new Subject<void>();

    request.raw.on('close', () => {
      this.logger.debug({ userId }, 'Unified SSE connection closed');
      disconnect$.next();
      disconnect$.complete();
      this.unifiedSSE.removeUser(userId);
    });

    const events$ = this.unifiedSSE.getUnifiedStream(userId).pipe(takeUntil(disconnect$));

    const keepalive$ = interval(30000).pipe(
      takeUntil(disconnect$),
      map(
        () =>
          ({
            type: 'keepalive',
            data: { timestamp: Date.now() },
          }) as MessageEvent
      )
    );

    return new Observable((subscriber) => {
      subscriber.next({
        type: 'connected',
        data: { userId, timestamp: Date.now() },
      } as MessageEvent);

      const sub = rxMerge(events$, keepalive$).subscribe((evt) => subscriber.next(evt));

      return () => {
        sub.unsubscribe();
      };
    });
  }
}
