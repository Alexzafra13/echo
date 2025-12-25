import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { Friendship } from '../entities/friendship.entity';

@Injectable()
export class AcceptFriendRequestUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
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

    return this.socialRepository.acceptFriendRequest(friendshipId, userId);
  }
}
