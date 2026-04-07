import { Inject, Injectable } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { ListeningUser } from '../entities/friendship.entity';

@Injectable()
export class GetListeningFriendsUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
  ) {}

  async execute(userId: string): Promise<ListeningUser[]> {
    return this.socialRepository.getListeningFriends(userId);
  }
}
