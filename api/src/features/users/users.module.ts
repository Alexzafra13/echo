import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { UsersController } from './presentation/users.controller';
import {
  ChangePasswordUseCase,
  UpdateProfileUseCase,
  ChangeThemeUseCase,
  ChangeLanguageUseCase,
  UploadAvatarUseCase,
  DeleteAvatarUseCase,
  UpdatePrivacySettingsUseCase,
  UpdateHomePreferencesUseCase,
} from './domain/use-cases';

@Module({
  imports: [
    AuthModule,
    ExternalMetadataModule,
  ],
  controllers: [UsersController],
  providers: [
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    ChangeThemeUseCase,
    ChangeLanguageUseCase,
    UploadAvatarUseCase,
    DeleteAvatarUseCase,
    UpdatePrivacySettingsUseCase,
    UpdateHomePreferencesUseCase,
  ],
})
export class UsersModule {}