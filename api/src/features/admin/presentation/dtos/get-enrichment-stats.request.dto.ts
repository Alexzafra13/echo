import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetEnrichmentStatsRequestDto {
  @ApiPropertyOptional({
    description: 'Time period to filter enrichment stats',
    example: 'week',
    enum: ['today', 'week', 'month', 'all'],
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'all'])
  period?: 'today' | 'week' | 'month' | 'all';
}
