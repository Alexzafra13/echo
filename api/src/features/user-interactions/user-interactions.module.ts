import { Module } from '@nestjs/common';
import { USER_INTERACTIONS_REPOSITORY } from './domain/ports';
import { DrizzleUserInteractionsRepository } from './infrastructure/persistence/user-interactions.repository';
import {
  SetRatingUseCase,
  RemoveRatingUseCase,
  GetUserInteractionsUseCase,
  GetItemSummaryUseCase,
} from './domain/use-cases';
import { UserInteractionsController } from './presentation/controller/user-interactions.controller';

/**
 * UserInteractionsModule
 * Handles user ratings for tracks, albums, artists, and playlists.
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  controllers: [UserInteractionsController],
  providers: [
    {
      provide: USER_INTERACTIONS_REPOSITORY,
      useClass: DrizzleUserInteractionsRepository,
    },
    SetRatingUseCase,
    RemoveRatingUseCase,
    GetUserInteractionsUseCase,
    GetItemSummaryUseCase,
  ],
  exports: [USER_INTERACTIONS_REPOSITORY],
})
export class UserInteractionsModule {}
