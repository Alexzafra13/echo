import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq, and, or, desc, lt, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { conversations, messages, users } from '@infrastructure/database/schema';
import { IChatRepository } from '../../domain/ports/chat.repository.port';
import { ConversationDto, MessageDto } from '../../domain/entities/chat.entity';

@Injectable()
export class DrizzleChatRepository implements IChatRepository {
  constructor(
    @InjectPinoLogger(DrizzleChatRepository.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService
  ) {}

  async getOrCreateConversation(userId: string, otherUserId: string): Promise<string> {
    // Always store with lower UUID first for consistent lookup
    const [userOneId, userTwoId] =
      userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

    // Try to find existing
    const existing = await this.drizzle.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.userOneId, userOneId), eq(conversations.userTwoId, userTwoId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new
    const [created] = await this.drizzle.db
      .insert(conversations)
      .values({ userOneId, userTwoId })
      .returning({ id: conversations.id });

    this.logger.debug({ userId, otherUserId, conversationId: created.id }, 'Created conversation');
    return created.id;
  }

  async getConversations(userId: string): Promise<ConversationDto[]> {
    // Get all conversations where user is a participant
    const rows = await this.drizzle.db.execute(sql`
      SELECT
        c.id,
        c.last_message_at,
        c.created_at,
        CASE WHEN c.user_one_id = ${userId} THEN c.user_two_id ELSE c.user_one_id END as other_user_id,
        u.username as other_username,
        u.name as other_name,
        u.avatar_path as other_avatar,
        m.content as last_msg_content,
        m.sender_id as last_msg_sender,
        m.created_at as last_msg_at,
        (
          SELECT COUNT(*)::int FROM messages
          WHERE messages.conversation_id = c.id
            AND messages.sender_id != ${userId}
            AND messages.read_at IS NULL
        ) as unread_count
      FROM conversations c
      JOIN users u ON u.id = CASE WHEN c.user_one_id = ${userId} THEN c.user_two_id ELSE c.user_one_id END
      LEFT JOIN LATERAL (
        SELECT content, sender_id, created_at
        FROM messages
        WHERE messages.conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE c.user_one_id = ${userId} OR c.user_two_id = ${userId}
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `);

    return (rows.rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      otherUser: {
        id: row.other_user_id as string,
        username: row.other_username as string,
        name: (row.other_name as string) || null,
        avatarUrl: row.other_avatar ? `/api/images/users/${row.other_user_id}/avatar` : null,
      },
      lastMessage: row.last_msg_content
        ? {
            content: row.last_msg_content as string,
            senderId: row.last_msg_sender as string,
            createdAt: new Date(row.last_msg_at as string),
          }
        : null,
      unreadCount: (row.unread_count as number) || 0,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    before?: string
  ): Promise<MessageDto[]> {
    const conditions = [eq(messages.conversationId, conversationId)];

    if (before) {
      conditions.push(lt(messages.createdAt, new Date(before)));
    }

    const rows = await this.drizzle.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return rows.reverse();
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<MessageDto> {
    const now = new Date();

    const [msg] = await this.drizzle.db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content,
      })
      .returning();

    // Update conversation's last_message_at
    await this.drizzle.db
      .update(conversations)
      .set({ lastMessageAt: now })
      .where(eq(conversations.id, conversationId));

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
    };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const now = new Date();
    await this.drizzle.db
      .update(messages)
      .set({ readAt: now })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.senderId} != ${userId}`,
          sql`${messages.readAt} IS NULL`
        )
      );
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const rows = await this.drizzle.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          or(eq(conversations.userOneId, userId), eq(conversations.userTwoId, userId))
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // Only delete if user is participant
    const isParticipant = await this.isParticipant(conversationId, userId);
    if (!isParticipant) return;

    await this.drizzle.db.delete(conversations).where(eq(conversations.id, conversationId));
  }
}
