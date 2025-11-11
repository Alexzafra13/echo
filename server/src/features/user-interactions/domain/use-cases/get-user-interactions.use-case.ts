import { Injectable, Inject } from '@nestjs/common';
import { IUserInteractionsRepository, USER_INTERACTIONS_REPOSITORY } from '../ports';
import { ItemType, UserInteraction } from '../entities/user-interaction.entity';

@Injectable()
export class GetUserInteractionsUseCase {
  constructor(
    @Inject(USER_INTERACTIONS_REPOSITORY)
    private readonly repository: IUserInteractionsRepository,
  ) {}

  async execute(userId: string, itemType?: ItemType): Promise<UserInteraction[]> {
    return await this.repository.getUserInteractions(userId, itemType);
  }
}
