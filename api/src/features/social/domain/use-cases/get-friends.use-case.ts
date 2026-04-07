import { Inject, Injectable } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { Friend } from '../entities/friendship.entity';

@Injectable()
export class GetFriendsUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
  ) {}

  async execute(userId: string): Promise<Friend[]> {
    return this.socialRepository.getFriends(userId);
  }
}
