import { Module } from '@nestjs/common';
import { SOCIAL_REPOSITORY } from './domain/ports';
import { DrizzleSocialRepository } from './infrastructure/persistence/social.repository';
import {
  SendFriendRequestUseCase,
  AcceptFriendRequestUseCase,
  RemoveFriendshipUseCase,
  GetFriendsUseCase,
  GetPendingRequestsUseCase,
  GetListeningFriendsUseCase,
  GetFriendsActivityUseCase,
  SearchUsersUseCase,
} from './domain/use-cases';
import { SocialController } from './presentation/controller/social.controller';

/**
 * SocialModule
 * Handles friendships, listening status, and activity feed
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  controllers: [SocialController],
  providers: [
    {
      provide: SOCIAL_REPOSITORY,
      useClass: DrizzleSocialRepository,
    },
    SendFriendRequestUseCase,
    AcceptFriendRequestUseCase,
    RemoveFriendshipUseCase,
    GetFriendsUseCase,
    GetPendingRequestsUseCase,
    GetListeningFriendsUseCase,
    GetFriendsActivityUseCase,
    SearchUsersUseCase,
  ],
  exports: [SOCIAL_REPOSITORY],
})
export class SocialModule {}
