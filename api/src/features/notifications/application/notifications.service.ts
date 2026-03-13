import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Cron } from '@nestjs/schedule';
import { eq, and, desc, lte, count, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  notifications,
  notificationPreferences,
  users,
  Notification,
  NotificationType,
} from '@infrastructure/database/schema';
import { NotificationEventsService } from './notification-events.service';

interface ListNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectPinoLogger(NotificationsService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly events: NotificationEventsService,
  ) {}

  /**
   * Create a notification for a specific user
   * Checks preferences before creating
   */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<Notification | null> {
    // Check user preference
    const enabled = await this.isEnabled(userId, type);
    if (!enabled) return null;

    const [notification] = await this.drizzle.db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        data: data ?? null,
        isRead: false,
      })
      .returning();

    // Emit SSE event for real-time delivery
    this.events.emit(userId, notification);

    return notification;
  }

  /**
   * Notify all admin users
   */
  async notifyAdmins(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const adminUsers = await this.drizzle.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isAdmin, true), eq(users.isActive, true)));

    for (const admin of adminUsers) {
      await this.notify(admin.id, type, title, message, data);
    }
  }

  /**
   * Notify all active users
   */
  async notifyAll(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const activeUsers = await this.drizzle.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true));

    for (const user of activeUsers) {
      await this.notify(user.id, type, title, message, data);
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: ListNotificationsOptions = {},
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const whereClause = and(...conditions);

    const [result, totalResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.drizzle.db
        .select({ count: count() })
        .from(notifications)
        .where(whereClause),
    ]);

    return {
      notifications: result,
      total: totalResult[0]?.count ?? 0,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return result[0]?.count ?? 0;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    await this.drizzle.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.drizzle.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string): Promise<number> {
    const result = await this.drizzle.db
      .delete(notifications)
      .where(eq(notifications.userId, userId))
      .returning({ id: notifications.id });

    return result.length;
  }

  // ============================================
  // Preferences
  // ============================================

  /**
   * Check if a notification type is enabled for a user
   * Defaults to true if no preference exists
   */
  async isEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const pref = await this.drizzle.db
      .select({ enabled: notificationPreferences.enabled })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notificationType, type),
        ),
      )
      .limit(1);

    // Default: enabled if no preference row exists
    return pref.length === 0 ? true : pref[0].enabled;
  }

  /**
   * Get all preferences for a user
   */
  async getPreferences(
    userId: string,
  ): Promise<{ notificationType: string; enabled: boolean }[]> {
    return this.drizzle.db
      .select({
        notificationType: notificationPreferences.notificationType,
        enabled: notificationPreferences.enabled,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  /**
   * Update a preference for a user (upsert)
   */
  async updatePreference(
    userId: string,
    type: NotificationType,
    enabled: boolean,
  ): Promise<void> {
    await this.drizzle.db
      .insert(notificationPreferences)
      .values({ userId, notificationType: type, enabled })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.notificationType],
        set: { enabled },
      });
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up old notifications daily at 3:30 AM
   */
  @Cron('30 3 * * *')
  async cleanupOldNotifications(): Promise<void> {
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.drizzle.db
      .delete(notifications)
      .where(lte(notifications.createdAt, cutoffDate))
      .returning({ id: notifications.id });

    if (result.length > 0) {
      this.logger.info(
        { deletedCount: result.length, retentionDays },
        'Notification cleanup completed',
      );
    }
  }
}
