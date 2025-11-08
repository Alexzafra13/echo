import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { AdminController } from './presentation/admin.controller';
import { EnrichmentHistoryController } from './presentation/enrichment-history.controller';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
  PermanentlyDeleteUserUseCase,
  ListEnrichmentLogsUseCase,
  GetEnrichmentStatsUseCase,
} from './domain/use-cases';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminController, EnrichmentHistoryController],
  providers: [
    CreateUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    ResetUserPasswordUseCase,
    PermanentlyDeleteUserUseCase,
    ListEnrichmentLogsUseCase,
    GetEnrichmentStatsUseCase,
  ],
})
export class AdminModule {}