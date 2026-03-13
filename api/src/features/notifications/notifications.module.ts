import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { NotificationsService } from './application/notifications.service';
import { NotificationEventsService } from './application/notification-events.service';
import { NotificationsController } from './presentation/notifications.controller';

/**
 * NotificationsModule
 * Persistent notifications with real-time SSE delivery
 * Other modules import this to create notifications via NotificationsService
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (secretsService: SecuritySecretsService) => ({
        secret: secretsService.jwtSecret,
        signOptions: { expiresIn: '15m' },
      }),
      inject: [SecuritySecretsService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEventsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
