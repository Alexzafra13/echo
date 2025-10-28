/**
 * GetScansHistoryInput - Entrada para obtener historial de escaneos
 */
export interface GetScansHistoryInput {
  /**
   * Página (empezando en 1)
   */
  page?: number;

  /**
   * Límite de resultados por página
   */
  limit?: number;
}

/**
 * ScanHistoryItem - Item del historial
 */
export interface ScanHistoryItem {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt?: Date;
  tracksAdded: number;
  tracksUpdated: number;
  tracksDeleted: number;
  totalChanges: number;
  durationMs?: number;
  errorMessage?: string;
}

/**
 * GetScansHistoryOutput - Salida con historial de escaneos
 */
export interface GetScansHistoryOutput {
  /**
   * Lista de escaneos
   */
  scans: ScanHistoryItem[];

  /**
   * Total de escaneos
   */
  total: number;

  /**
   * Página actual
   */
  page: number;

  /**
   * Límite por página
   */
  limit: number;

  /**
   * Total de páginas
   */
  totalPages: number;
}
