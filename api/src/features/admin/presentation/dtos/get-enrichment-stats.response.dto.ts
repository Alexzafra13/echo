import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { GetEnrichmentStatsOutput } from '../../infrastructure/use-cases/get-enrichment-stats';

export class ProviderStatsDto {
  @ApiProperty({ description: 'Name of the enrichment provider', example: 'spotify' })
  @Expose()
  provider!: string;

  @ApiProperty({ description: 'Total number of enrichments from this provider', example: 150 })
  @Expose()
  total!: number;

  @ApiProperty({ description: 'Number of successful enrichments', example: 120 })
  @Expose()
  success!: number;

  @ApiProperty({ description: 'Number of partial enrichments', example: 20 })
  @Expose()
  partial!: number;

  @ApiProperty({ description: 'Number of failed enrichments', example: 10 })
  @Expose()
  error!: number;

  @ApiProperty({ description: 'Success rate as a percentage', example: 80.0 })
  @Expose()
  successRate!: number;
}

export class EntityTypeStatsDto {
  @ApiProperty({ description: 'Number of artist enrichments', example: 85 })
  @Expose()
  artist!: number;

  @ApiProperty({ description: 'Number of album enrichments', example: 65 })
  @Expose()
  album!: number;
}

export class RecentActivityDto {
  @ApiProperty({ description: 'Date of the activity', example: '2026-04-07' })
  @Expose()
  date!: string;

  @ApiProperty({ description: 'Number of enrichments on this date', example: 12 })
  @Expose()
  count!: number;
}

export class GetEnrichmentStatsResponseDto {
  @ApiProperty({ description: 'Total number of enrichments', example: 500 })
  @Expose()
  totalEnrichments!: number;

  @ApiProperty({ description: 'Number of successful enrichments', example: 400 })
  @Expose()
  successCount!: number;

  @ApiProperty({ description: 'Number of partial enrichments', example: 70 })
  @Expose()
  partialCount!: number;

  @ApiProperty({ description: 'Number of failed enrichments', example: 30 })
  @Expose()
  errorCount!: number;

  @ApiProperty({ description: 'Overall success rate as a percentage', example: 80.0 })
  @Expose()
  successRate!: number;

  @ApiProperty({
    description: 'Enrichment statistics grouped by provider',
    type: [ProviderStatsDto],
  })
  @Expose()
  @Type(() => ProviderStatsDto)
  byProvider!: ProviderStatsDto[];

  @ApiProperty({
    description: 'Enrichment counts grouped by entity type',
    type: EntityTypeStatsDto,
  })
  @Expose()
  @Type(() => EntityTypeStatsDto)
  byEntityType!: EntityTypeStatsDto;

  @ApiProperty({ description: 'Average processing time in milliseconds', example: 1250 })
  @Expose()
  averageProcessingTime!: number;

  @ApiProperty({ description: 'Recent enrichment activity by date', type: [RecentActivityDto] })
  @Expose()
  @Type(() => RecentActivityDto)
  recentActivity!: RecentActivityDto[];

  static fromDomain(data: GetEnrichmentStatsOutput): GetEnrichmentStatsResponseDto {
    const dto = new GetEnrichmentStatsResponseDto();
    dto.totalEnrichments = data.totalEnrichments;
    dto.successCount = data.successCount;
    dto.partialCount = data.partialCount;
    dto.errorCount = data.errorCount;
    dto.successRate = data.successRate;
    dto.averageProcessingTime = data.averageProcessingTime;

    dto.byProvider = data.byProvider.map((p) => {
      const providerDto = new ProviderStatsDto();
      providerDto.provider = p.provider;
      providerDto.total = p.total;
      providerDto.success = p.success;
      providerDto.partial = p.partial;
      providerDto.error = p.error;
      providerDto.successRate = p.successRate;
      return providerDto;
    });

    const entityTypeDto = new EntityTypeStatsDto();
    entityTypeDto.artist = data.byEntityType.artist;
    entityTypeDto.album = data.byEntityType.album;
    dto.byEntityType = entityTypeDto;

    dto.recentActivity = data.recentActivity.map((a) => {
      const activityDto = new RecentActivityDto();
      activityDto.date = a.date;
      activityDto.count = a.count;
      return activityDto;
    });

    return dto;
  }
}
