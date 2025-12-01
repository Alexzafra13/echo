import { Injectable, Inject } from '@nestjs/common';
import { IUserInteractionsRepository, USER_INTERACTIONS_REPOSITORY } from '../ports';
import { ItemType, UserStarred } from '../entities/user-interaction.entity';

@Injectable()
export class ToggleDislikeUseCase {
  constructor(
    @Inject(USER_INTERACTIONS_REPOSITORY)
    private readonly repository: IUserInteractionsRepository,
  ) {}

  async execute(
    userId: string,
    itemId: string,
    itemType: ItemType,
  ): Promise<{ disliked: boolean; data?: UserStarred }> {
    const currentSentiment = await this.repository.getSentiment(userId, itemId, itemType);

    // If already disliked, remove it (toggle off)
    if (currentSentiment === 'dislike') {
      await this.repository.removeSentiment(userId, itemId, itemType);
      return { disliked: false };
    }

    // If liked or no sentiment, set to dislike
    const result = await this.repository.setDislike(userId, itemId, itemType);
    return { disliked: true, data: result };
  }
}
