import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { AdminController } from './presentation/admin.controller';
import {
  CreateUserUseCase,
  ListUsersUseCase,
} from './domain/use-cases';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminController],
  providers: [
    CreateUserUseCase,
    ListUsersUseCase,
  ],
})
export class AdminModule {}