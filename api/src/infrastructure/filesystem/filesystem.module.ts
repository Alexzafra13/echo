import { Global, Module } from '@nestjs/common';
import { FilesystemService, SETTINGS_SERVICE_TOKEN } from './filesystem.service';
import { SettingsService } from '@infrastructure/settings';

@Global()
@Module({
  providers: [
    FilesystemService,
    {
      provide: SETTINGS_SERVICE_TOKEN,
      useExisting: SettingsService,
    },
  ],
  exports: [FilesystemService],
})
export class FilesystemModule {}
