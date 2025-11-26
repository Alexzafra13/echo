import { LibraryScan as PrismaLibraryScan } from '../../../../generated/prisma';
import { LibraryScan } from '../../domain/entities/library-scan.entity';

/**
 * ScannerMapper - Convierte entre entidad del dominio y modelo de Prisma
 *
 * Responsabilidades:
 * - Convertir de Prisma → Domain
 * - Convertir de Domain → Prisma
 * - Mantener separación entre capas
 */
export class ScannerMapper {
  /**
   * Convierte de modelo Prisma a entidad del dominio
   */
  static toDomain(prismaModel: PrismaLibraryScan): LibraryScan {
    return LibraryScan.fromPrimitives({
      id: prismaModel.id,
      status: prismaModel.status as any,
      startedAt: prismaModel.startedAt,
      finishedAt: prismaModel.finishedAt || undefined,
      tracksAdded: prismaModel.tracksAdded,
      tracksUpdated: prismaModel.tracksUpdated,
      tracksDeleted: prismaModel.tracksDeleted,
      errorMessage: prismaModel.errorMessage || undefined,
    });
  }

  /**
   * Convierte array de Prisma a array de dominio
   */
  static toDomainArray(prismaModels: PrismaLibraryScan[]): LibraryScan[] {
    return prismaModels.map((model) => this.toDomain(model));
  }

  /**
   * Convierte de entidad del dominio a modelo de Prisma
   */
  static toPersistence(domain: LibraryScan): any {
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
