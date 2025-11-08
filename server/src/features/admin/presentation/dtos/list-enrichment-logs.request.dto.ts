import { IsOptional, IsInt, Min, IsIn, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListEnrichmentLogsRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;

  @IsOptional()
  @IsIn(['artist', 'album'])
  entityType?: 'artist' | 'album';

  @IsOptional()
  provider?: string;

  @IsOptional()
  @IsIn(['success', 'partial', 'error'])
  status?: 'success' | 'partial' | 'error';

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
