import { Expose, Type } from 'class-transformer';
import { ListEnrichmentLogsOutput } from '../../infrastructure/use-cases/list-enrichment-logs';

export class EnrichmentLogItemDto {
  @Expose()
  id!: string;

  @Expose()
  entityId!: string;

  @Expose()
  entityType!: string;

  @Expose()
  entityName!: string;

  @Expose()
  provider!: string;

  @Expose()
  metadataType!: string;

  @Expose()
  status!: string;

  @Expose()
  fieldsUpdated!: string[];

  @Expose()
  errorMessage?: string;

  @Expose()
  previewUrl?: string;

  @Expose()
  userId?: string;

  @Expose()
  processingTime?: number;

  @Expose()
  createdAt!: Date;
}

export class ListEnrichmentLogsResponseDto {
  @Expose()
  @Type(() => EnrichmentLogItemDto)
  logs!: EnrichmentLogItemDto[];

  @Expose()
  total!: number;

  static fromDomain(data: ListEnrichmentLogsOutput): ListEnrichmentLogsResponseDto {
    const dto = new ListEnrichmentLogsResponseDto();
    dto.logs = data.logs.map((log) => {
      const logDto = new EnrichmentLogItemDto();
      logDto.id = log.id;
      logDto.entityId = log.entityId;
      logDto.entityType = log.entityType;
      logDto.entityName = log.entityName;
      logDto.provider = log.provider;
      logDto.metadataType = log.metadataType;
      logDto.status = log.status;
      logDto.fieldsUpdated = log.fieldsUpdated;
      logDto.errorMessage = log.errorMessage;
      logDto.previewUrl = log.previewUrl;
      logDto.userId = log.userId;
      logDto.processingTime = log.processingTime;
      logDto.createdAt = log.createdAt;
      return logDto;
    });
    dto.total = data.total;
    return dto;
  }
}
