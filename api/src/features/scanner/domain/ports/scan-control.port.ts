/**
 * Interface for controlling a running scan (pause/cancel/resume).
 * Used to break the circular dependency between ScannerGateway and ScanProcessorService.
 */
export interface IScanControl {
  pauseScan(scanId: string): Promise<boolean>;
  cancelScan(scanId: string, reason?: string): Promise<boolean>;
  resumeScan(scanId: string): Promise<boolean>;
}

export const SCAN_CONTROL = 'IScanControl';
