import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StreamTokenService } from './stream-token.service';

@Injectable()
export class StreamTokenCleanupService {
  private readonly logger = new Logger(StreamTokenCleanupService.name);

  constructor(private readonly streamTokenService: StreamTokenService) {}

  /**
   * Cleanup expired stream tokens every hour
   * Runs at minute 0 of every hour (e.g., 00:00, 01:00, 02:00...)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    try {
      const deletedCount = await this.streamTokenService.cleanupExpiredTokens();
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} expired stream token(s)`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired stream tokens', error);
    }
  }
}
