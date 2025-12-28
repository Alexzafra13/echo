import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base DTO for page-based pagination queries.
 * Use this for endpoints that use page/limit style pagination.
 *
 * @example
 * ```typescript
 * @Get()
 * async getItems(@Query() query: PaginationQueryDto) {
 *   return this.service.findAll(query.page, query.limit);
 * }
 * ```
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (starts at 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO for skip/take (offset) style pagination.
 * Use this for endpoints that use offset-based pagination.
 *
 * @example
 * ```typescript
 * @Get()
 * async getItems(@Query() query: OffsetPaginationQueryDto) {
 *   return this.service.findAll(query.skip, query.take);
 * }
 * ```
 */
export class OffsetPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of items to take',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;
}

/**
 * Simple limit query DTO for endpoints that only need a limit.
 * Use for lists without full pagination (e.g., "top 10", "recent 5").
 *
 * @example
 * ```typescript
 * @Get('recent')
 * async getRecent(@Query() query: LimitQueryDto) {
 *   return this.service.findRecent(query.limit);
 * }
 * ```
 */
export class LimitQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of items to return',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
