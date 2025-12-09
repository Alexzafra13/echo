import { Inject, Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { IUserRepository, USER_REPOSITORY } from '@features/auth/domain/ports/user-repository.port';
import { Friendship } from '../entities/friendship.entity';
import { SocialEventsService } from '../services/social-events.service';

@Injectable()
export class SendFriendRequestUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly socialEventsService: SocialEventsService,
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
          const accepted = await this.socialRepository.acceptFriendRequest(existing.id, requesterId);
          // Emit accepted event
          await this.emitAcceptedEvent(existing.id, requesterId, existing.requesterId);
          return accepted;
        }
        throw new ConflictException('Friend request already sent');
      }
      if (existing.status === 'blocked') {
        throw new BadRequestException('Cannot send friend request to this user');
      }
    }

    const friendship = await this.socialRepository.sendFriendRequest(requesterId, addresseeId);

    // Emit friend request received event
    await this.emitRequestReceivedEvent(friendship.id, requesterId, addresseeId);

    return friendship;
  }

  private async emitRequestReceivedEvent(
    friendshipId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<void> {
    const fromUser = await this.userRepository.findById(fromUserId);
    if (fromUser) {
      this.socialEventsService.emitFriendRequestReceived({
        friendshipId,
        fromUserId,
        fromUsername: fromUser.username,
        fromName: fromUser.name ?? null,
        toUserId,
        timestamp: new Date().toISOString(),
      });
    }
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
