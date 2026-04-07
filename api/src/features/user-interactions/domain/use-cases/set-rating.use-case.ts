import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { IUserInteractionsRepository, USER_INTERACTIONS_REPOSITORY } from '../ports';
import { ItemType, UserRating } from '../entities/user-interaction.entity';

@Injectable()
export class SetRatingUseCase {
  constructor(
    @Inject(USER_INTERACTIONS_REPOSITORY)
    private readonly repository: IUserInteractionsRepository,
  ) {}

  async execute(userId: string, itemId: string, itemType: ItemType, rating: number): Promise<UserRating> {
    // Validate rating (1-5 stars)
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new ValidationError('Rating must be an integer between 1 and 5');
    }

    return await this.repository.setRating(userId, itemId, itemType, rating);
  }
}
