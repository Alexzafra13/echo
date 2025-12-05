import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface ListeningNowUpdate {
  userId: string;
  isPlaying: boolean;
  currentTrackId: string | null;
  timestamp: Date;
}

/**
 * ListeningNowService
 *
 * Manages real-time notifications when users update their playback state.
 * Uses EventEmitter pattern to notify connected SSE clients.
 *
 * When a user updates their playback state:
 * 1. UpdatePlaybackStateUseCase calls this service
 * 2. This service emits an event with the user's new state
 * 3. SSE endpoints listening for this user's friends receive the update
 */
@Injectable()
export class ListeningNowService {
  private readonly emitter = new EventEmitter();

  constructor(
    @InjectPinoLogger(ListeningNowService.name)
    private readonly logger: PinoLogger,
  ) {
    // Increase max listeners since many users may subscribe
    this.emitter.setMaxListeners(1000);
  }

  /**
   * Emit a playback state update
   * Called when a user starts/stops playing music
   */
  emitUpdate(update: ListeningNowUpdate): void {
    this.logger.debug(
      { userId: update.userId, isPlaying: update.isPlaying },
      'Emitting listening now update',
    );
    this.emitter.emit('update', update);
  }

  /**
   * Subscribe to all updates
   * The subscriber can filter by friend IDs
   */
  subscribe(callback: (update: ListeningNowUpdate) => void): () => void {
    this.emitter.on('update', callback);
    return () => this.emitter.off('update', callback);
  }

  /**
   * Get the event emitter for direct access
   */
  getEmitter(): EventEmitter {
    return this.emitter;
  }
}
