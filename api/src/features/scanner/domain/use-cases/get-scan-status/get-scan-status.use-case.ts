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

/**
 * GetScanStatusUseCase - Obtiene el estado de un escaneo
 *
 * Responsabilidades:
 * - Validar el ID del escaneo
 * - Buscar el escaneo en el repositorio
 * - Retornar el estado completo del escaneo
 */
@Injectable()
export class GetScanStatusUseCase {
  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
  ) {}

  async execute(input: GetScanStatusInput): Promise<GetScanStatusOutput> {
    // 1. Validar entrada
    if (!input.id || input.id.trim() === '') {
      throw new NotFoundError('LibraryScan', 'invalid-id');
    }

    // 2. Buscar escaneo
    const scan = await this.scannerRepository.findById(input.id);

    // 3. Validar que existe
    if (!scan) {
      throw new NotFoundError('LibraryScan', input.id);
    }

    // 4. Retornar estado completo
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
