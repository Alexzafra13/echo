import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { Notification } from '@infrastructure/database/schema';

export interface NotificationSSEEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Per-user SSE event bus for real-time notification delivery
 */
@Injectable()
export class NotificationEventsService {
  private userStreams = new Map<string, Subject<NotificationSSEEvent>>();

  /**
   * Get or create a stream for a specific user
   */
  getUserStream(userId: string): Observable<NotificationSSEEvent> {
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Subject<NotificationSSEEvent>());
    }
    return this.userStreams.get(userId)!.asObservable();
  }

  /**
   * Emit a notification to a specific user
   */
  emit(userId: string, notification: Notification): void {
    const stream = this.userStreams.get(userId);
    if (stream) {
      stream.next({
        event: 'notification',
        data: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
        },
      });
    }
  }

  /**
   * Emit to multiple users (e.g., all admins)
   */
  emitToMany(userIds: string[], notification: Notification): void {
    for (const userId of userIds) {
      this.emit(userId, notification);
    }
  }

  /**
   * Remove a user's stream (cleanup on disconnect)
   */
  removeUser(userId: string): void {
    const stream = this.userStreams.get(userId);
    if (stream) {
      stream.complete();
      this.userStreams.delete(userId);
    }
  }
}
