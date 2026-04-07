import { LibraryScan } from '../../domain/entities/library-scan.entity';
import {
  LibraryScan as LibraryScanDb,
  NewLibraryScan,
} from '@infrastructure/database/schema/system';
import { ScanStatus } from '../../domain/entities/library-scan.entity';

export class ScannerMapper {
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

  static toDomainArray(raw: LibraryScanDb[]): LibraryScan[] {
    return raw.map((item) => this.toDomain(item));
  }

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
