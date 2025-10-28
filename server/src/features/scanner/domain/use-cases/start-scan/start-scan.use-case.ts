import { Injectable, Inject } from '@nestjs/common';
import { LibraryScan } from '../../entities/library-scan.entity';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../ports/scanner-repository.port';
import { StartScanInput, StartScanOutput } from './start-scan.dto';

// Inyectamos el servicio de procesamiento como dependencia externa
export interface IScanProcessor {
  enqueueScan(scanId: string, options?: any): Promise<void>;
}

export const SCAN_PROCESSOR = 'IScanProcessor';

/**
 * StartScanUseCase - Inicia un nuevo escaneo de la librería
 *
 * Responsabilidades:
 * - Crear un nuevo registro de escaneo
 * - Encolar el trabajo de escaneo en BullMQ
 * - Retornar la información del escaneo iniciado
 *
 * Nota: El procesamiento real se hace en background con BullMQ
 */
@Injectable()
export class StartScanUseCase {
  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
    @Inject(SCAN_PROCESSOR)
    private readonly scanProcessor: IScanProcessor,
  ) {}

  async execute(input: StartScanInput = {}): Promise<StartScanOutput> {
    // 1. Verificar si hay un escaneo en progreso
    const runningScan = await this.scannerRepository.findByStatus('running');
    if (runningScan.length > 0) {
      throw new Error(
        'Ya hay un escaneo en progreso. Espere a que finalice antes de iniciar otro.',
      );
    }

    // 2. Crear nueva entidad de escaneo
    const scan = LibraryScan.create({
      status: 'pending',
      startedAt: new Date(),
      tracksAdded: 0,
      tracksUpdated: 0,
      tracksDeleted: 0,
    });

    // 3. Guardar en BD
    const savedScan = await this.scannerRepository.create(scan);

    // 4. Encolar trabajo en BullMQ
    await this.scanProcessor.enqueueScan(savedScan.id, {
      path: input.path,
      recursive: input.recursive,
      pruneDeleted: input.pruneDeleted,
    });

    // 5. Retornar información
    return {
      id: savedScan.id,
      status: savedScan.status,
      startedAt: savedScan.startedAt,
      message: 'Escaneo iniciado. El proceso se ejecutará en segundo plano.',
    };
  }
}
