import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Meta información para respuestas paginadas
 */
export class PaginationMeta {
  @ApiProperty({ description: 'Total de elementos', example: 100 })
  total!: number;

  @ApiProperty({ description: 'Página actual (1-indexed)', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Elementos por página', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total de páginas', example: 5 })
  totalPages!: number;

  @ApiProperty({ description: 'Hay página siguiente', example: true })
  hasNext!: boolean;

  @ApiProperty({ description: 'Hay página anterior', example: false })
  hasPrevious!: boolean;

  static create(params: {
    total: number;
    page: number;
    limit: number;
  }): PaginationMeta {
    const meta = new PaginationMeta();
    meta.total = params.total;
    meta.page = params.page;
    meta.limit = params.limit;
    meta.totalPages = Math.ceil(params.total / params.limit);
    meta.hasNext = params.page < meta.totalPages;
    meta.hasPrevious = params.page > 1;
    return meta;
  }
}

/**
 * Respuesta paginada genérica
 * Usar para estandarizar todas las respuestas con paginación
 *
 * @example
 * ```typescript
 * // En un controlador
 * async getAlbums(): Promise<PaginatedResponse<AlbumResponseDto>> {
 *   const result = await this.getAlbumsUseCase.execute({ page: 1, limit: 20 });
 *   return PaginatedResponse.create(
 *     result.albums.map(a => AlbumResponseDto.fromDomain(a)),
 *     { total: result.total, page: 1, limit: 20 }
 *   );
 * }
 * ```
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Lista de elementos', isArray: true })
  data!: T[];

  @ApiProperty({ description: 'Meta información de paginación', type: PaginationMeta })
  meta!: PaginationMeta;

  static create<T>(
    data: T[],
    pagination: { total: number; page: number; limit: number },
  ): PaginatedResponse<T> {
    const response = new PaginatedResponse<T>();
    response.data = data;
    response.meta = PaginationMeta.create(pagination);
    return response;
  }
}

/**
 * Respuesta paginada simple (para APIs con skip/take)
 * Compatible con el formato existente de la API
 */
export class SimplePaginatedResponse<T> {
  @ApiProperty({ description: 'Lista de elementos', isArray: true })
  data!: T[];

  @ApiProperty({ description: 'Total de elementos', example: 100 })
  total!: number;

  @ApiPropertyOptional({ description: 'Elementos omitidos', example: 0 })
  skip?: number;

  @ApiPropertyOptional({ description: 'Elementos retornados', example: 20 })
  take?: number;

  @ApiProperty({ description: 'Hay más elementos', example: true })
  hasMore!: boolean;

  static create<T>(
    data: T[],
    params: { total: number; skip?: number; take?: number },
  ): SimplePaginatedResponse<T> {
    const response = new SimplePaginatedResponse<T>();
    response.data = data;
    response.total = params.total;
    response.skip = params.skip;
    response.take = params.take;
    response.hasMore = (params.skip ?? 0) + data.length < params.total;
    return response;
  }
}
