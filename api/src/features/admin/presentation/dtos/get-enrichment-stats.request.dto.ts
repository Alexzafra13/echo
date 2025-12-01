import { IsOptional, IsIn } from 'class-validator';

export class GetEnrichmentStatsRequestDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'all'])
  period?: 'today' | 'week' | 'month' | 'all';
}
