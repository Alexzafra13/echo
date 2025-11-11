import { Injectable, Inject } from '@nestjs/common';
import { IUserInteractionsRepository, USER_INTERACTIONS_REPOSITORY } from '../ports';
import { ItemType, ItemInteractionSummary } from '../entities/user-interaction.entity';

@Injectable()
export class GetItemSummaryUseCase {
  constructor(
    @Inject(USER_INTERACTIONS_REPOSITORY)
    private readonly repository: IUserInteractionsRepository,
  ) {}

  async execute(itemId: string, itemType: ItemType, userId?: string): Promise<ItemInteractionSummary> {
    return await this.repository.getItemInteractionSummary(itemId, itemType, userId);
  }
}
