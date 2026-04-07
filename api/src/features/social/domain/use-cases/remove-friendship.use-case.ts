import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';

@Injectable()
export class RemoveFriendshipUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
  ) {}

  async execute(friendshipId: string, userId: string): Promise<void> {
    const friendship = await this.socialRepository.getFriendshipById(friendshipId);

    if (!friendship) {
      throw new NotFoundError('Friendship');
    }

    // Either party can remove the friendship
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new ForbiddenError('You cannot remove this friendship');
    }

    return this.socialRepository.removeFriendship(friendshipId, userId);
  }
}
