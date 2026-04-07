import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../ports/scanner-repository.port';
import {
  GetScanStatusInput,
  GetScanStatusOutput,
} from './get-scan-status.dto';

@Injectable()
export class GetScanStatusUseCase {
  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
  ) {}

  async execute(input: GetScanStatusInput): Promise<GetScanStatusOutput> {
    if (!input.id || input.id.trim() === '') {
      throw new NotFoundError('LibraryScan', 'invalid-id');
    }

    const scan = await this.scannerRepository.findById(input.id);

    if (!scan) {
      throw new NotFoundError('LibraryScan', input.id);
    }

    return {
      id: scan.id,
      status: scan.status,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      tracksAdded: scan.tracksAdded,
      tracksUpdated: scan.tracksUpdated,
      tracksDeleted: scan.tracksDeleted,
      totalChanges: scan.getTotalChanges(),
      durationMs: scan.getDuration() || undefined,
      errorMessage: scan.errorMessage,
    };
  }
}
