import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { USER_INTERACTIONS_REPOSITORY } from './domain/ports';
import { PrismaUserInteractionsRepository } from './infrastructure/persistence/user-interactions.repository';
import {
  ToggleLikeUseCase,
  ToggleDislikeUseCase,
  SetRatingUseCase,
  RemoveRatingUseCase,
  GetUserInteractionsUseCase,
  GetItemSummaryUseCase,
} from './domain/use-cases';
import { UserInteractionsController } from './presentation/controller/user-interactions.controller';

@Module({
  controllers: [UserInteractionsController],
  providers: [
    PrismaService,
    {
      provide: USER_INTERACTIONS_REPOSITORY,
      useClass: PrismaUserInteractionsRepository,
    },
    ToggleLikeUseCase,
    ToggleDislikeUseCase,
    SetRatingUseCase,
    RemoveRatingUseCase,
    GetUserInteractionsUseCase,
    GetItemSummaryUseCase,
  ],
  exports: [USER_INTERACTIONS_REPOSITORY],
})
export class UserInteractionsModule {}
