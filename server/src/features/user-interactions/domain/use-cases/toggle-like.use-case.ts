import { Injectable, Inject } from '@nestjs/common';
import { IUserInteractionsRepository, USER_INTERACTIONS_REPOSITORY } from '../ports';
import { ItemType, UserStarred } from '../entities/user-interaction.entity';

@Injectable()
export class ToggleLikeUseCase {
  constructor(
    @Inject(USER_INTERACTIONS_REPOSITORY)
    private readonly repository: IUserInteractionsRepository,
  ) {}

  async execute(userId: string, itemId: string, itemType: ItemType): Promise<{ liked: boolean; data?: UserStarred }> {
    const currentSentiment = await this.repository.getSentiment(userId, itemId, itemType);

    // If already liked, remove it (toggle off)
    if (currentSentiment === 'like') {
      await this.repository.removeSentiment(userId, itemId, itemType);
      return { liked: false };
    }

    // If disliked or no sentiment, set to like
    const result = await this.repository.setLike(userId, itemId, itemType);
    return { liked: true, data: result };
  }
}
