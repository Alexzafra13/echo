import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { NotificationsModule } from '@features/notifications/notifications.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { FederationModule } from '@features/federation/federation.module';
import { UnifiedSSEService } from './unified-sse.service';
import { UnifiedSSEController } from './unified-sse.controller';

@Module({
  imports: [
    NotificationsModule,
    ExternalMetadataModule,
    FederationModule,
    JwtModule.registerAsync({
      useFactory: async (secretsService: SecuritySecretsService) => ({
        secret: secretsService.jwtSecret,
        signOptions: { expiresIn: '15m' },
      }),
      inject: [SecuritySecretsService],
    }),
  ],
  controllers: [UnifiedSSEController],
  providers: [UnifiedSSEService],
})
export class UnifiedSSEModule {}
