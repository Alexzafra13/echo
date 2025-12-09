import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
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
import { ListeningNowService } from './domain/services/listening-now.service';
import { SocialEventsService } from './domain/services/social-events.service';
import { SocialController } from './presentation/controller/social.controller';
import { SocialEventsController } from './presentation/controller/social-events.controller';

/**
 * SocialModule
 * Handles friendships, listening status, activity feed, and real-time social notifications
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  imports: [AuthModule],
  controllers: [SocialController, SocialEventsController],
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
    ListeningNowService,
    SocialEventsService,
  ],
  exports: [SOCIAL_REPOSITORY, ListeningNowService, SocialEventsService],
})
export class SocialModule {}
