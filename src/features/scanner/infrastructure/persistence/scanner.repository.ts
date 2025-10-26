import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { LibraryScan } from '../../domain/entities/library-scan.entity';
import { IScannerRepository } from '../../domain/ports/scanner-repository.port';
import { ScannerMapper } from './scanner.mapper';

/**
 * PrismaScannerRepository - Implementación de IScannerRepository con Prisma
 *
 * Implementa los métodos del port IScannerRepository
 * Usa PrismaService para acceder a la BD
 * Usa ScannerMapper para convertir Prisma ↔ Domain
 */
@Injectable()
export class PrismaScannerRepository implements IScannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca escaneo por ID
   */
  async findById(id: string): Promise<LibraryScan | null> {
    const scan = await this.prisma.libraryScan.findUnique({
      where: { id },
    });

    return scan ? ScannerMapper.toDomain(scan) : null;
  }

  /**
   * Obtiene todos los escaneos con paginación
   */
  async findAll(skip: number, take: number): Promise<LibraryScan[]> {
    const scans = await this.prisma.libraryScan.findMany({
      skip,
      take,
      orderBy: { startedAt: 'desc' },
    });

    return ScannerMapper.toDomainArray(scans);
  }

  /**
   * Obtiene el escaneo más reciente
   */
  async findLatest(): Promise<LibraryScan | null> {
    const scan = await this.prisma.libraryScan.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    return scan ? ScannerMapper.toDomain(scan) : null;
  }

  /**
   * Obtiene escaneos por estado
   */
  async findByStatus(status: string): Promise<LibraryScan[]> {
    const scans = await this.prisma.libraryScan.findMany({
      where: { status },
      orderBy: { startedAt: 'desc' },
    });

    return ScannerMapper.toDomainArray(scans);
  }

  /**
   * Crea nuevo escaneo
   */
  async create(scan: LibraryScan): Promise<LibraryScan> {
    const persistenceData = ScannerMapper.toPersistence(scan);

    const created = await this.prisma.libraryScan.create({
      data: persistenceData,
    });

    return ScannerMapper.toDomain(created);
  }

  /**
   * Actualiza escaneo
   */
  async update(
    id: string,
    data: Partial<LibraryScan>,
  ): Promise<LibraryScan | null> {
    const primitives = data.toPrimitives ? data.toPrimitives() : data;

    const updateData: any = {};
    if (primitives.status) updateData.status = primitives.status;
    if (primitives.finishedAt !== undefined)
      updateData.finishedAt = primitives.finishedAt;
    if (primitives.tracksAdded !== undefined)
      updateData.tracksAdded = primitives.tracksAdded;
    if (primitives.tracksUpdated !== undefined)
      updateData.tracksUpdated = primitives.tracksUpdated;
    if (primitives.tracksDeleted !== undefined)
      updateData.tracksDeleted = primitives.tracksDeleted;
    if (primitives.errorMessage !== undefined)
      updateData.errorMessage = primitives.errorMessage;

    const updated = await this.prisma.libraryScan
      .update({
        where: { id },
        data: updateData,
      })
      .catch(() => null);

    return updated ? ScannerMapper.toDomain(updated) : null;
  }

  /**
   * Cuenta total de escaneos
   */
  async count(): Promise<number> {
    return this.prisma.libraryScan.count();
  }
}
