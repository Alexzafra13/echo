import { Module, Global } from '@nestjs/common';
import { SecuritySecretsService } from './security-secrets.service';

@Global()
@Module({
  providers: [SecuritySecretsService],
  exports: [SecuritySecretsService],
})
export class SecuritySecretsModule {}
