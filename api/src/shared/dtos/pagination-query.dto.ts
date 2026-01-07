import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * PaginationQueryDto - DTO base para paginación por página
 *
 * Usar para endpoints que usan paginación estilo page/limit.
 * Los parámetros son opcionales con valores por defecto.
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
 * OffsetPaginationQueryDto - DTO para paginación por offset
 *
 * Usar para endpoints que usan paginación estilo skip/take (offset).
 * Útil para scroll infinito o paginación basada en cursor.
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
 * LimitQueryDto - DTO simple para límite sin paginación completa
 *
 * Usar para listas que solo necesitan un límite (ej: "top 10", "últimos 5").
 * No incluye offset ni información de página.
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
