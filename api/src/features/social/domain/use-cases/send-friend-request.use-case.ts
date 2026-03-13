import { Inject, Injectable } from '@nestjs/common';
import { ValidationError, ConflictError } from '@shared/errors';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { Friendship } from '../entities/friendship.entity';
import { NotificationsService } from '@features/notifications/application/notifications.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { users } from '@infrastructure/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SendFriendRequestUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
    private readonly notificationsService: NotificationsService,
    private readonly drizzle: DrizzleService,
  ) {}

  async execute(requesterId: string, addresseeId: string): Promise<Friendship> {
    // Cannot send request to yourself
    if (requesterId === addresseeId) {
      throw new ValidationError('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existing = await this.socialRepository.getFriendshipBetweenUsers(requesterId, addresseeId);

    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictError('You are already friends with this user');
      }
      if (existing.status === 'pending') {
        // If they sent us a request, accept it instead
        if (existing.addresseeId === requesterId) {
          const accepted = await this.socialRepository.acceptFriendRequest(existing.id, requesterId);
          // Notify both users about mutual acceptance
          this.notifyAccepted(requesterId, addresseeId).catch(() => {});
          return accepted;
        }
        throw new ConflictError('Friend request already sent');
      }
      if (existing.status === 'blocked') {
        throw new ValidationError('Cannot send friend request to this user');
      }
    }

    const friendship = await this.socialRepository.sendFriendRequest(requesterId, addresseeId);

    // Notify the addressee about the incoming friend request
    this.notifyRequestReceived(requesterId, addresseeId, friendship.id).catch(() => {});

    return friendship;
  }

  private async getUserDisplayName(userId: string): Promise<string | null> {
    const row = await this.drizzle.db
      .select({ name: users.name, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .then((r) => r[0]);
    return row ? (row.name || row.username) : null;
  }

  private async notifyRequestReceived(requesterId: string, addresseeId: string, friendshipId: string): Promise<void> {
    const displayName = await this.getUserDisplayName(requesterId);
    if (!displayName) return;

    await this.notificationsService.notify(
      addresseeId,
      'friend_request_received',
      displayName,
      `${displayName} te ha enviado una solicitud de amistad`,
      { friendshipId, requesterId },
    );
  }

  private async notifyAccepted(accepterId: string, originalRequesterId: string): Promise<void> {
    const [accepterName, requesterName] = await Promise.all([
      this.getUserDisplayName(accepterId),
      this.getUserDisplayName(originalRequesterId),
    ]);

    if (accepterName) {
      await this.notificationsService.notify(
        originalRequesterId,
        'friend_request_accepted',
        accepterName,
        `${accepterName} ha aceptado tu solicitud de amistad`,
        { friendId: accepterId },
      );
    }
    if (requesterName) {
      await this.notificationsService.notify(
        accepterId,
        'friend_request_accepted',
        requesterName,
        `Ahora eres amigo de ${requesterName}`,
        { friendId: originalRequesterId },
      );
    }
  }
}
