import { LibraryScan } from '../../domain/entities/library-scan.entity';
import {
  LibraryScan as LibraryScanDb,
  NewLibraryScan,
} from '@infrastructure/database/schema/system';
import { ScanStatus } from '../../domain/entities/library-scan.entity';

/**
 * ScannerMapper - Convierte entre entidad del dominio y modelo de BD
 *
 * Responsabilidades:
 * - Convertir de DB → Domain
 * - Convertir de Domain → DB
 * - Mantener separación entre capas
 */
export class ScannerMapper {
  /**
   * Convierte de registro de BD a entidad del dominio
   */
  static toDomain(raw: LibraryScanDb): LibraryScan {
    return LibraryScan.fromPrimitives({
      id: raw.id,
      status: raw.status as ScanStatus,
      startedAt: raw.startedAt,
      finishedAt: raw.finishedAt || undefined,
      tracksAdded: raw.tracksAdded,
      tracksUpdated: raw.tracksUpdated,
      tracksDeleted: raw.tracksDeleted,
      errorMessage: raw.errorMessage || undefined,
    });
  }

  /**
   * Convierte array de BD a array de dominio
   */
  static toDomainArray(raw: LibraryScanDb[]): LibraryScan[] {
    return raw.map((item) => this.toDomain(item));
  }

  /**
   * Convierte de entidad del dominio a modelo de BD
   */
  static toPersistence(domain: LibraryScan): NewLibraryScan {
    const primitives = domain.toPrimitives();

    return {
      id: primitives.id,
      status: primitives.status,
      startedAt: primitives.startedAt,
      finishedAt: primitives.finishedAt || null,
      tracksAdded: primitives.tracksAdded,
      tracksUpdated: primitives.tracksUpdated,
      tracksDeleted: primitives.tracksDeleted,
      errorMessage: primitives.errorMessage || null,
    };
  }
}
