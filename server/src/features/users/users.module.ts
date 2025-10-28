import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { UsersController } from './presentation/users.controller';
import {
  ChangePasswordUseCase,
  UpdateProfileUseCase,
  ChangeThemeUseCase,
  ChangeLanguageUseCase,
} from './domain/use-cases';

@Module({
  imports: [AuthModule], // Para importar USER_REPOSITORY, PASSWORD_SERVICEw
  controllers: [UsersController],
  providers: [
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    ChangeThemeUseCase,
    ChangeLanguageUseCase,
  ],
})
export class UsersModule {}