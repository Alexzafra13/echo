import { Injectable, Inject } from '@nestjs/common';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../ports/scanner-repository.port';
import {
  GetScansHistoryInput,
  GetScansHistoryOutput,
  ScanHistoryItem,
} from './get-scans-history.dto';

@Injectable()
export class GetScansHistoryUseCase {
  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
  ) {}

  async execute(
    input: GetScansHistoryInput = {},
  ): Promise<GetScansHistoryOutput> {
    const page = input.page || 1;
    const limit = input.limit || 20;
    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      this.scannerRepository.findAll(skip, limit),
      this.scannerRepository.count(),
    ]);

    const scanItems: ScanHistoryItem[] = scans.map((scan) => ({
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
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      scans: scanItems,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
