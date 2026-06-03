/**
 * Controla un scan en marcha (pausar/cancelar/reanudar). Rompe la dependencia
 * circular entre ScannerGateway y ScanProcessorService.
 */
export interface IScanControl {
  pauseScan(scanId: string): Promise<boolean>;
  cancelScan(scanId: string, reason?: string): Promise<boolean>;
  resumeScan(scanId: string): Promise<boolean>;
}

export const SCAN_CONTROL = 'IScanControl';
