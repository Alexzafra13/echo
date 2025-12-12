import { Inject, Injectable } from '@nestjs/common';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../ports';
import { Friend } from '../entities/friendship.types';

@Injectable()
export class GetPendingRequestsUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
  ) {}

  async execute(userId: string): Promise<{ received: Friend[]; sent: Friend[]; count: number }> {
    const [received, sent, count] = await Promise.all([
      this.socialRepository.getPendingRequests(userId),
      this.socialRepository.getSentRequests(userId),
      this.socialRepository.countPendingRequests(userId),
    ]);

    return { received, sent, count };
  }
}
