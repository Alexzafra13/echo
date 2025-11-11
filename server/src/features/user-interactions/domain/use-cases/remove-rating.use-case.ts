import { Injectable, Inject } from '@nestjs/common';
import { IUserInteractionsRepository, USER_INTERACTIONS_REPOSITORY } from '../ports';
import { ItemType } from '../entities/user-interaction.entity';

@Injectable()
export class RemoveRatingUseCase {
  constructor(
    @Inject(USER_INTERACTIONS_REPOSITORY)
    private readonly repository: IUserInteractionsRepository,
  ) {}

  async execute(userId: string, itemId: string, itemType: ItemType): Promise<void> {
    await this.repository.removeRating(userId, itemId, itemType);
  }
}
