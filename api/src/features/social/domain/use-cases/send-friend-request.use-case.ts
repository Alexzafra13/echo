import { Inject, Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { Friendship } from '../entities/friendship.entity';

@Injectable()
export class SendFriendRequestUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
  ) {}

  async execute(requesterId: string, addresseeId: string): Promise<Friendship> {
    // Cannot send request to yourself
    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existing = await this.socialRepository.getFriendshipBetweenUsers(requesterId, addresseeId);

    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictException('You are already friends with this user');
      }
      if (existing.status === 'pending') {
        // If they sent us a request, accept it instead
        if (existing.addresseeId === requesterId) {
          return this.socialRepository.acceptFriendRequest(existing.id, requesterId);
        }
        throw new ConflictException('Friend request already sent');
      }
      if (existing.status === 'blocked') {
        throw new BadRequestException('Cannot send friend request to this user');
      }
    }

    return this.socialRepository.sendFriendRequest(requesterId, addresseeId);
  }
}
