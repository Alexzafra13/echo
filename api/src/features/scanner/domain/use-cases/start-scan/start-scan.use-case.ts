import { Injectable, Inject } from '@nestjs/common';
import { LibraryScan } from '../../entities/library-scan.entity';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../ports/scanner-repository.port';
import { StartScanInput, StartScanOutput } from './start-scan.dto';
import { ScannerError } from '@shared/errors';

export interface IScanProcessor {
  enqueueScan(scanId: string, options?: any): Promise<void>;
}

export const SCAN_PROCESSOR = 'IScanProcessor';

@Injectable()
export class StartScanUseCase {
  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
    @Inject(SCAN_PROCESSOR)
    private readonly scanProcessor: IScanProcessor,
  ) {}

  async execute(input: StartScanInput = {}): Promise<StartScanOutput> {
    const runningScan = await this.scannerRepository.findByStatus('running');
    if (runningScan.length > 0) {
      throw new ScannerError('SCAN_ALREADY_RUNNING');
    }

    const scan = LibraryScan.create({
      status: 'pending',
      startedAt: new Date(),
      tracksAdded: 0,
      tracksUpdated: 0,
      tracksDeleted: 0,
    });

    const savedScan = await this.scannerRepository.create(scan);

    await this.scanProcessor.enqueueScan(savedScan.id, {
      path: input.path,
      recursive: input.recursive,
      pruneDeleted: input.pruneDeleted,
    });

    return {
      id: savedScan.id,
      status: savedScan.status,
      startedAt: savedScan.startedAt,
      message: 'Escaneo iniciado. El proceso se ejecutará en segundo plano.',
    };
  }
}
