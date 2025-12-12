import { Inject, Injectable } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { ActivityItem } from '../entities/friendship.types';

@Injectable()
export class GetFriendsActivityUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
  ) {}

  async execute(userId: string, limit: number = 20): Promise<ActivityItem[]> {
    return this.socialRepository.getFriendsActivity(userId, limit);
  }
}
