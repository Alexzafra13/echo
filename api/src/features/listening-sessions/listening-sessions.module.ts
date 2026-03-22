import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { LISTENING_SESSION_REPOSITORY } from './domain/ports';
import { DrizzleListeningSessionRepository } from './infrastructure/persistence/listening-session.repository';
import {
  CreateSessionUseCase,
  JoinSessionUseCase,
  LeaveSessionUseCase,
  AddToQueueUseCase,
  SkipTrackUseCase,
  GetSessionUseCase,
  EndSessionUseCase,
  UpdateParticipantRoleUseCase,
} from './domain/use-cases';
import { ListeningSessionsController } from './presentation/controller/listening-sessions.controller';
import { ListeningSessionsGateway } from './presentation/gateway/listening-sessions.gateway';

/**
 * ListeningSessionsModule
 * Shared listening sessions with collaborative queue management
 */
@Module({
  imports: [TracksModule],
  controllers: [ListeningSessionsController],
  providers: [
    {
      provide: LISTENING_SESSION_REPOSITORY,
      useClass: DrizzleListeningSessionRepository,
    },
    CreateSessionUseCase,
    JoinSessionUseCase,
    LeaveSessionUseCase,
    AddToQueueUseCase,
    SkipTrackUseCase,
    GetSessionUseCase,
    EndSessionUseCase,
    UpdateParticipantRoleUseCase,
    ListeningSessionsGateway,
  ],
  exports: [LISTENING_SESSION_REPOSITORY, ListeningSessionsGateway],
})
export class ListeningSessionsModule {}
