import { Module, Global } from '@nestjs/common';
import { SecuritySecretsService } from './security-secrets.service';

/**
 * SecuritySecretsModule - Provides auto-generated JWT secrets
 *
 * This module is global so secrets are available throughout the app.
 * Secrets are auto-generated on first run and stored in the database.
 */
@Global()
@Module({
  providers: [SecuritySecretsService],
  exports: [SecuritySecretsService],
})
export class SecuritySecretsModule {}
