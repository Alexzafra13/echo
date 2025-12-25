import { Expose, Type } from 'class-transformer';
import { GetEnrichmentStatsOutput, ProviderStats } from '../../infrastructure/use-cases/get-enrichment-stats';

export class ProviderStatsDto {
  @Expose()
  provider!: string;

  @Expose()
  total!: number;

  @Expose()
  success!: number;

  @Expose()
  partial!: number;

  @Expose()
  error!: number;

  @Expose()
  successRate!: number;
}

export class EntityTypeStatsDto {
  @Expose()
  artist!: number;

  @Expose()
  album!: number;
}

export class RecentActivityDto {
  @Expose()
  date!: string;

  @Expose()
  count!: number;
}

export class GetEnrichmentStatsResponseDto {
  @Expose()
  totalEnrichments!: number;

  @Expose()
  successCount!: number;

  @Expose()
  partialCount!: number;

  @Expose()
  errorCount!: number;

  @Expose()
  successRate!: number;

  @Expose()
  @Type(() => ProviderStatsDto)
  byProvider!: ProviderStatsDto[];

  @Expose()
  @Type(() => EntityTypeStatsDto)
  byEntityType!: EntityTypeStatsDto;

  @Expose()
  averageProcessingTime!: number;

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
