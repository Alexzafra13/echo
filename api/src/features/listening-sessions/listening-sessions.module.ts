import { Module, OnModuleInit } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { NotificationsModule } from '@features/notifications/notifications.module';
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
import { SessionCleanupService } from './infrastructure/services/session-cleanup.service';

/**
 * ListeningSessionsModule
 * Sesiones de escucha compartida con cola colaborativa y auto-cierre
 */
@Module({
  imports: [TracksModule, NotificationsModule],
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
    SessionCleanupService,
  ],
  exports: [LISTENING_SESSION_REPOSITORY, ListeningSessionsGateway, SessionCleanupService],
})
export class ListeningSessionsModule implements OnModuleInit {
  constructor(
    private readonly gateway: ListeningSessionsGateway,
    private readonly cleanupService: SessionCleanupService,
  ) {}

  // Conectar cleanup service con gateway despues de que ambos esten inicializados
  onModuleInit() {
    this.gateway.setCleanupService(this.cleanupService);
  }
}
