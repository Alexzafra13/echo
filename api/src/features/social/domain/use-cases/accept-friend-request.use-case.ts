import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { IUserRepository, USER_REPOSITORY } from '@features/auth/domain/ports/user-repository.port';
import { Friendship } from '../entities/friendship.types';
import { SocialEventsService } from '../services/social-events.service';

@Injectable()
export class AcceptFriendRequestUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly socialEventsService: SocialEventsService,
  ) {}

  async execute(friendshipId: string, userId: string): Promise<Friendship> {
    const friendship = await this.socialRepository.getFriendshipById(friendshipId);

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // Only the addressee can accept
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('You cannot accept this friend request');
    }

    if (friendship.status !== 'pending') {
      throw new ForbiddenException('This friend request cannot be accepted');
    }

    const accepted = await this.socialRepository.acceptFriendRequest(friendshipId, userId);

    // Emit accepted event to notify the original requester
    await this.emitAcceptedEvent(friendshipId, userId, friendship.requesterId);

    return accepted;
  }

  private async emitAcceptedEvent(
    friendshipId: string,
    acceptedByUserId: string,
    originalRequesterId: string,
  ): Promise<void> {
    const acceptedByUser = await this.userRepository.findById(acceptedByUserId);
    if (acceptedByUser) {
      this.socialEventsService.emitFriendRequestAccepted({
        friendshipId,
        acceptedByUserId,
        acceptedByUsername: acceptedByUser.username,
        acceptedByName: acceptedByUser.name ?? null,
        originalRequesterId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
