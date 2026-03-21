import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { Friendship } from '../entities/friendship.entity';
import { NotificationsService } from '@features/notifications/application/notifications.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { users } from '@infrastructure/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AcceptFriendRequestUseCase {
  constructor(
    @InjectPinoLogger(AcceptFriendRequestUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
    private readonly notificationsService: NotificationsService,
    private readonly drizzle: DrizzleService,
  ) {}

  async execute(friendshipId: string, userId: string): Promise<Friendship> {
    const friendship = await this.socialRepository.getFriendshipById(friendshipId);

    if (!friendship) {
      throw new NotFoundError('Friend request');
    }

    // Only the addressee can accept
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenError('You cannot accept this friend request');
    }

    if (friendship.status !== 'pending') {
      throw new ForbiddenError('This friend request cannot be accepted');
    }

    const accepted = await this.socialRepository.acceptFriendRequest(friendshipId, userId);

    // Notify both users about the accepted friendship
    this.notifyAccepted(userId, friendship.requesterId).catch((e) => {
      this.logger.warn(`No se pudo notificar aceptación de amistad: ${(e as Error).message}`);
    });

    return accepted;
  }

  private async getUserDisplayName(userId: string): Promise<string | null> {
    const row = await this.drizzle.db
      .select({ name: users.name, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .then((r) => r[0]);
    return row ? (row.name || row.username) : null;
  }

  private async notifyAccepted(accepterId: string, requesterId: string): Promise<void> {
    const [accepterName, requesterName] = await Promise.all([
      this.getUserDisplayName(accepterId),
      this.getUserDisplayName(requesterId),
    ]);

    // Notify the original requester that their request was accepted
    if (accepterName) {
      await this.notificationsService.notify(
        requesterId,
        'friend_request_accepted',
        accepterName,
        `${accepterName} ha aceptado tu solicitud de amistad`,
        { friendId: accepterId },
      );
    }

    // Notify the accepter that they are now friends
    if (requesterName) {
      await this.notificationsService.notify(
        accepterId,
        'friend_request_accepted',
        requesterName,
        `Ahora eres amigo de ${requesterName}`,
        { friendId: requesterId },
      );
    }
  }
}
