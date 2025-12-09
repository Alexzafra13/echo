import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Event types for social notifications
 */
export interface FriendRequestReceivedEvent {
  type: 'friend_request:received';
  data: {
    friendshipId: string;
    fromUserId: string;
    fromUsername: string;
    fromName: string | null;
    toUserId: string;
    timestamp: string;
  };
}

export interface FriendRequestAcceptedEvent {
  type: 'friend_request:accepted';
  data: {
    friendshipId: string;
    acceptedByUserId: string;
    acceptedByUsername: string;
    acceptedByName: string | null;
    originalRequesterId: string;
    timestamp: string;
  };
}

export type SocialEvent = FriendRequestReceivedEvent | FriendRequestAcceptedEvent;

/**
 * Service that emits SSE events for social notifications.
 * Called by use cases when friend requests are sent or accepted.
 */
@Injectable()
export class SocialEventsService {
  private readonly emitter = new EventEmitter();

  constructor(
    @InjectPinoLogger(SocialEventsService.name)
    private readonly logger: PinoLogger,
  ) {
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emit event when a friend request is sent
   */
  emitFriendRequestReceived(data: FriendRequestReceivedEvent['data']): void {
    const event: FriendRequestReceivedEvent = {
      type: 'friend_request:received',
      data,
    };
    this.logger.info(
      { toUserId: data.toUserId, fromUserId: data.fromUserId },
      'Emitting friend request received event',
    );
    this.emitter.emit('social-event', event);
  }

  /**
   * Emit event when a friend request is accepted
   */
  emitFriendRequestAccepted(data: FriendRequestAcceptedEvent['data']): void {
    const event: FriendRequestAcceptedEvent = {
      type: 'friend_request:accepted',
      data,
    };
    this.logger.info(
      { acceptedBy: data.acceptedByUserId, requester: data.originalRequesterId },
      'Emitting friend request accepted event',
    );
    this.emitter.emit('social-event', event);
  }

  /**
   * Subscribe to social events for a specific user
   * @param userId - The user ID to filter events for
   * @param callback - Callback function to handle events
   * @returns Unsubscribe function
   */
  subscribe(
    userId: string,
    callback: (event: SocialEvent) => void,
  ): () => void {
    const handler = (event: SocialEvent) => {
      // Filter events - only send to relevant user
      if (event.type === 'friend_request:received' && event.data.toUserId === userId) {
        callback(event);
      } else if (event.type === 'friend_request:accepted' && event.data.originalRequesterId === userId) {
        callback(event);
      }
    };

    this.emitter.on('social-event', handler);
    return () => this.emitter.off('social-event', handler);
  }
}
