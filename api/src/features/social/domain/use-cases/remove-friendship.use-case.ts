import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
      throw new NotFoundException('Friendship not found');
    }

    // Either party can remove the friendship
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new ForbiddenException('You cannot remove this friendship');
    }

    return this.socialRepository.removeFriendship(friendshipId, userId);
  }
}
