export interface PaginationParams {
  skip: number;
  take: number;
}

export interface ParsePaginationOptions {
  defaultTake?: number;
  maxTake?: number;
}

// Parsea query params de paginación (strings) a números validados
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

// Igual que parsePaginationParams pero para cuando ya son números
export function validatePagination(
  skip?: number,
  take?: number,
  options: { maxTake?: number; defaultTake?: number } | number = {},
): PaginationParams {
  const opts = typeof options === 'number'
    ? { maxTake: options, defaultTake: 10 }
    : options;

  const maxTake = opts.maxTake ?? 100;
  const defaultTake = opts.defaultTake ?? 10;

  return {
    skip: Math.max(0, skip ?? 0),
    take: Math.min(maxTake, Math.max(1, take ?? defaultTake)),
  };
}
