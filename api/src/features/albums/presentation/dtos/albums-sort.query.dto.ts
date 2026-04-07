import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlbumResponseDto } from './album.response.dto';
import { PaginationQueryDto, LimitQueryDto } from '@shared/dtos/pagination-query.dto';

// Reutilizar DTOs compartidos en vez de duplicar
export { PaginationQueryDto as AlbumsPaginationQueryDto };
export { LimitQueryDto as AlbumsLimitQueryDto };

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
