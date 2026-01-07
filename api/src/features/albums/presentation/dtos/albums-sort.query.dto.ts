import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlbumResponseDto } from './album.response.dto';

/**
 * DTO para query params de paginación de álbumes
 */
export class AlbumsPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Número de página (empieza en 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de álbumes por página',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO para query params de límite simple (sin paginación)
 */
export class AlbumsLimitQueryDto {
  @ApiPropertyOptional({
    description: 'Cantidad máxima de álbumes a retornar',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO para respuesta de álbumes con paginación completa
 * Formato estandarizado: data + page/limit/total/totalPages
 */
export class AlbumsPaginatedResponseDto {
  @ApiPropertyOptional({ description: 'Lista de álbumes', type: [AlbumResponseDto] })
  data!: AlbumResponseDto[];

  @ApiPropertyOptional({ description: 'Total de álbumes' })
  total!: number;

  @ApiPropertyOptional({ description: 'Página actual' })
  page!: number;

  @ApiPropertyOptional({ description: 'Límite por página' })
  limit!: number;

  @ApiPropertyOptional({ description: 'Total de páginas' })
  totalPages!: number;
}

/**
 * DTO para respuesta simple de lista de álbumes
 * Formato estandarizado: data + paginación opcional
 */
export class AlbumsListResponseDto {
  @ApiPropertyOptional({ description: 'Lista de álbumes', type: [AlbumResponseDto] })
  data!: AlbumResponseDto[];

  @ApiPropertyOptional({ description: 'Página actual (si aplica)' })
  page?: number;

  @ApiPropertyOptional({ description: 'Límite (si aplica)' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Indica si hay más resultados' })
  hasMore?: boolean;
}
