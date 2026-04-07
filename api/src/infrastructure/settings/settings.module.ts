import { Global, Module } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { SettingsService } from './settings.service';
import { SETTINGS_REPOSITORY } from './settings-repository.port';

/**
 * SettingsModule — Global infrastructure module
 *
 * Marked @Global() so SettingsService is available everywhere without
 * explicit imports. Register once in AppModule.
 */
@Global()
@Module({
  providers: [
    SettingsRepository,
    { provide: SETTINGS_REPOSITORY, useClass: SettingsRepository },
    SettingsService,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
