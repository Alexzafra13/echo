/**
 * StartScanInput - Entrada para iniciar un escaneo
 */
export interface StartScanInput {
  /**
   * Ruta a escanear (opcional, usa UPLOAD_PATH por defecto)
   */
  path?: string;

  /**
   * Si debe escanear subdirectorios
   */
  recursive?: boolean;

  /**
   * Si debe eliminar tracks que ya no existen
   */
  pruneDeleted?: boolean;
}

/**
 * StartScanOutput - Salida del inicio de escaneo
 */
export interface StartScanOutput {
  /**
   * ID del escaneo creado
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
   * Mensaje informativo
   */
  message: string;
}
