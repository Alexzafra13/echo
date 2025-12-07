import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { enrichmentLogs } from '@infrastructure/database/schema';

export interface EnrichmentLogData {
  entityId: string;
  entityType: 'artist' | 'album';
  entityName: string;
  provider: string;
  metadataType: string;
  status: 'success' | 'partial' | 'error';
  fieldsUpdated: string[];
  errorMessage?: string;
  previewUrl?: string;
  processingTime?: number;
}

/**
 * Service for logging enrichment operations
 * Records metadata enrichment for tracking and analytics
 */
@Injectable()
export class EnrichmentLogService {
  private readonly logger = new Logger(EnrichmentLogService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Create an enrichment log entry
   */
  async log(data: EnrichmentLogData): Promise<void> {
    try {
      await this.drizzle.db
        .insert(enrichmentLogs)
        .values({
          entityId: data.entityId,
          entityType: data.entityType,
          entityName: data.entityName,
          provider: data.provider,
          metadataType: data.metadataType,
          status: data.status,
          fieldsUpdated: data.fieldsUpdated,
          errorMessage: data.errorMessage,
          previewUrl: data.previewUrl,
          processingTime: data.processingTime,
        });
    } catch (error) {
      // Don't throw - logging failure shouldn't break the enrichment process
      this.logger.error(`Failed to create enrichment log: ${(error as Error).message}`);
    }
  }

  /**
   * Log a successful enrichment
   */
  async logSuccess(
    entityId: string,
    entityType: 'artist' | 'album',
    entityName: string,
    provider: string,
    metadataType: string,
    fieldsUpdated: string[],
    processingTime?: number,
    previewUrl?: string,
  ): Promise<void> {
    await this.log({
      entityId,
      entityType,
      entityName,
      provider,
      metadataType,
      status: 'success',
      fieldsUpdated,
      processingTime,
      previewUrl,
    });
  }

  /**
   * Log a partial enrichment (some operations failed)
   */
  async logPartial(
    entityId: string,
    entityType: 'artist' | 'album',
    entityName: string,
    provider: string,
    metadataType: string,
    errorMessage: string,
    processingTime?: number,
  ): Promise<void> {
    await this.log({
      entityId,
      entityType,
      entityName,
      provider,
      metadataType,
      status: 'partial',
      fieldsUpdated: [],
      errorMessage,
      processingTime,
    });
  }

  /**
   * Log a failed enrichment
   */
  async logError(
    entityId: string,
    entityType: 'artist' | 'album',
    entityName: string,
    provider: string,
    metadataType: string,
    errorMessage: string,
    processingTime?: number,
  ): Promise<void> {
    await this.log({
      entityId,
      entityType,
      entityName,
      provider,
      metadataType,
      status: 'error',
      fieldsUpdated: [],
      errorMessage,
      processingTime,
    });
  }
}
