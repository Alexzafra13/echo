import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListEnrichmentLogsOutput } from '../../infrastructure/use-cases/list-enrichment-logs';

export class EnrichmentLogItemDto {
  @ApiProperty({
    description: 'Unique identifier of the enrichment log entry',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'ID of the enriched entity',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  entityId!: string;

  @ApiProperty({ description: 'Type of the enriched entity', example: 'artist' })
  @Expose()
  entityType!: string;

  @ApiProperty({ description: 'Display name of the enriched entity', example: 'Radiohead' })
  @Expose()
  entityName!: string;

  @ApiProperty({ description: 'Enrichment provider used', example: 'spotify' })
  @Expose()
  provider!: string;

  @ApiProperty({ description: 'Type of metadata enriched', example: 'biography' })
  @Expose()
  metadataType!: string;

  @ApiProperty({ description: 'Status of the enrichment operation', example: 'success' })
  @Expose()
  status!: string;

  @ApiProperty({
    description: 'List of fields that were updated',
    example: ['biography', 'genres', 'imageUrl'],
  })
  @Expose()
  fieldsUpdated!: string[];

  @ApiPropertyOptional({
    description: 'Error message if the enrichment failed',
    example: 'Provider rate limit exceeded',
  })
  @Expose()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Preview URL for the enriched content',
    example: 'https://example.com/preview/abc123',
  })
  @Expose()
  previewUrl?: string;

  @ApiPropertyOptional({
    description: 'ID of the user who triggered the enrichment',
    example: 'user-xyz-789',
  })
  @Expose()
  userId?: string;

  @ApiPropertyOptional({ description: 'Processing time in milliseconds', example: 1500 })
  @Expose()
  processingTime?: number;

  @ApiProperty({
    description: 'Timestamp when the enrichment was created',
    example: '2026-04-07T12:00:00.000Z',
  })
  @Expose()
  createdAt!: Date;
}

export class ListEnrichmentLogsResponseDto {
  @ApiProperty({ description: 'List of enrichment log entries', type: [EnrichmentLogItemDto] })
  @Expose()
  @Type(() => EnrichmentLogItemDto)
  logs!: EnrichmentLogItemDto[];

  @ApiProperty({ description: 'Total number of enrichment log entries', example: 42 })
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
