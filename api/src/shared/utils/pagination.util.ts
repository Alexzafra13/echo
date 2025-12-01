/**
 * Interfaz para parámetros de paginación parseados
 */
export interface PaginationParams {
  skip: number;
  take: number;
}

/**
 * Opciones de configuración para el parseo de paginación
 */
export interface ParsePaginationOptions {
  /** Número de elementos por defecto a retornar */
  defaultTake?: number;
  /** Número máximo de elementos permitidos */
  maxTake?: number;
}

/**
 * parsePaginationParams - Utility para parsear y validar parámetros de paginación
 *
 * Convierte strings de query params a números y aplica validación:
 * - skip: >= 0 (si es negativo o inválido, se usa 0)
 * - take: entre 1 y maxTake (si es inválido, se usa defaultTake)
 *
 * Casos de uso:
 * - Controllers que reciben pagination query params
 * - Evita código duplicado en validación de paginación
 *
 * @param skip - Query param skip como string
 * @param take - Query param take como string
 * @param options - Opciones de configuración
 * @returns Objeto con skip y take validados como números
 *
 * @example
 * ```typescript
 * // En un controller:
 * @Get()
 * async getItems(@Query('skip') skip?: string, @Query('take') take?: string) {
 *   const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take);
 *   return this.useCase.execute({ skip: skipNum, take: takeNum });
 * }
 *
 * // Con opciones personalizadas:
 * const params = parsePaginationParams(skip, take, {
 *   defaultTake: 20,
 *   maxTake: 200
 * });
 * ```
 */
export function parsePaginationParams(
  skip?: string,
  take?: string,
  options?: ParsePaginationOptions
): PaginationParams {
  const defaultTake = options?.defaultTake ?? 10;
  const maxTake = options?.maxTake ?? 100;

  const skipNum = Math.max(0, parseInt(skip || '0', 10) || 0);
  const takeNum = Math.min(
    maxTake,
    Math.max(1, parseInt(take || defaultTake.toString(), 10) || defaultTake)
  );

  return {
    skip: skipNum,
    take: takeNum,
  };
}

export function validatePagination(
  skip?: number,
  take?: number,
  maxTake: number = 100,
): PaginationParams {
  return {
    skip: Math.max(0, skip ?? 0),
    take: Math.min(maxTake, Math.max(1, take ?? 10)),
  };
}
