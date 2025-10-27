/**
 * GetScanStatusInput - Entrada para obtener estado de un escaneo
 */
export interface GetScanStatusInput {
  /**
   * ID del escaneo
   */
  id: string;
}

/**
 * GetScanStatusOutput - Salida con el estado del escaneo
 */
export interface GetScanStatusOutput {
  /**
   * ID del escaneo
   */
  id: string;

  /**
   * Estado del escaneo
   */
  status: string;

  /**
   * Fecha de inicio
   */
  startedAt: Date;

  /**
   * Fecha de finalización (si terminó)
   */
  finishedAt?: Date;

  /**
   * Tracks añadidos
   */
  tracksAdded: number;

  /**
   * Tracks actualizados
   */
  tracksUpdated: number;

  /**
   * Tracks eliminados
   */
  tracksDeleted: number;

  /**
   * Total de cambios
   */
  totalChanges: number;

  /**
   * Duración en milisegundos (si terminó)
   */
  durationMs?: number;

  /**
   * Mensaje de error (si falló)
   */
  errorMessage?: string;
}
