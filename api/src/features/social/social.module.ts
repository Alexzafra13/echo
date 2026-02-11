import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SecuritySecretsService } from '@config/security-secrets.service';
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
import { SocialController } from './presentation/controller/social.controller';

/**
 * SocialModule
 * Handles friendships, listening status, and activity feed
 * DrizzleService is provided globally via DrizzleModule
 * JwtModule needed for SSE endpoint authentication (EventSource can't use headers)
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (secretsService: SecuritySecretsService) => ({
        secret: secretsService.jwtSecret,
        signOptions: { expiresIn: '15m' },
      }),
      inject: [SecuritySecretsService],
    }),
  ],
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
    ListeningNowService,
  ],
  exports: [SOCIAL_REPOSITORY, ListeningNowService],
})
export class SocialModule {}
