import { Inject, Injectable } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { FriendshipStatus } from '../entities/friendship.entity';

export interface SearchUserResult {
  id: string;
  username: string;
  name: string | null;
  avatarPath: string | null;
  friendshipStatus: FriendshipStatus | null;
}

@Injectable()
export class SearchUsersUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
  ) {}

  async execute(query: string, currentUserId: string, limit: number = 10): Promise<SearchUserResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    return this.socialRepository.searchUsers(query.trim(), currentUserId, limit);
  }
}
