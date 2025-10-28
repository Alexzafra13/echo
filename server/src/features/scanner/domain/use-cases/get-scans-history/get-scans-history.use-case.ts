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

/**
 * GetScansHistoryUseCase - Obtiene el historial de escaneos
 *
 * Responsabilidades:
 * - Obtener lista paginada de escaneos
 * - Calcular metadatos de paginación
 * - Retornar historial completo
 */
@Injectable()
export class GetScansHistoryUseCase {
  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
  ) {}

  async execute(
    input: GetScansHistoryInput = {},
  ): Promise<GetScansHistoryOutput> {
    // 1. Configurar paginación
    const page = input.page || 1;
    const limit = input.limit || 20;
    const skip = (page - 1) * limit;

    // 2. Obtener escaneos y total
    const [scans, total] = await Promise.all([
      this.scannerRepository.findAll(skip, limit),
      this.scannerRepository.count(),
    ]);

    // 3. Mapear a DTOs
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

    // 4. Calcular total de páginas
    const totalPages = Math.ceil(total / limit);

    // 5. Retornar
    return {
      scans: scanItems,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
