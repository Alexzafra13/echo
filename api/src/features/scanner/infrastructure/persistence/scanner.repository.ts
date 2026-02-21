import { Injectable } from '@nestjs/common';
import { eq, desc, count } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { libraryScans } from '@infrastructure/database/schema';
import { LibraryScan, LibraryScanProps } from '../../domain/entities/library-scan.entity';
import { IScannerRepository } from '../../domain/ports/scanner-repository.port';
import { ScannerMapper } from './scanner.mapper';

@Injectable()
export class DrizzleScannerRepository implements IScannerRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: string): Promise<LibraryScan | null> {
    const result = await this.drizzle.db
      .select()
      .from(libraryScans)
      .where(eq(libraryScans.id, id))
      .limit(1);

    return result[0] ? ScannerMapper.toDomain(result[0]) : null;
  }

  async findAll(skip: number, take: number): Promise<LibraryScan[]> {
    const result = await this.drizzle.db
      .select()
      .from(libraryScans)
      .orderBy(desc(libraryScans.startedAt))
      .offset(skip)
      .limit(take);

    return ScannerMapper.toDomainArray(result);
  }

  async findLatest(): Promise<LibraryScan | null> {
    const result = await this.drizzle.db
      .select()
      .from(libraryScans)
      .orderBy(desc(libraryScans.startedAt))
      .limit(1);

    return result[0] ? ScannerMapper.toDomain(result[0]) : null;
  }

  async findByStatus(status: string): Promise<LibraryScan[]> {
    const result = await this.drizzle.db
      .select()
      .from(libraryScans)
      .where(eq(libraryScans.status, status))
      .orderBy(desc(libraryScans.startedAt));

    return ScannerMapper.toDomainArray(result);
  }

  async create(scan: LibraryScan): Promise<LibraryScan> {
    const persistenceData = ScannerMapper.toPersistence(scan);

    const result = await this.drizzle.db.insert(libraryScans).values(persistenceData).returning();

    return ScannerMapper.toDomain(result[0]);
  }

  async update(id: string, data: Partial<LibraryScanProps>): Promise<LibraryScan | null> {
    const primitives = data;

    const updateData: Partial<{
      status: string;
      finishedAt: Date;
      tracksAdded: number;
      tracksUpdated: number;
      tracksDeleted: number;
      errorMessage: string;
    }> = {};
    if (primitives.status) updateData.status = primitives.status;
    if (primitives.finishedAt !== undefined) updateData.finishedAt = primitives.finishedAt;
    if (primitives.tracksAdded !== undefined) updateData.tracksAdded = primitives.tracksAdded;
    if (primitives.tracksUpdated !== undefined) updateData.tracksUpdated = primitives.tracksUpdated;
    if (primitives.tracksDeleted !== undefined) updateData.tracksDeleted = primitives.tracksDeleted;
    if (primitives.errorMessage !== undefined) updateData.errorMessage = primitives.errorMessage;

    try {
      const result = await this.drizzle.db
        .update(libraryScans)
        .set(updateData)
        .where(eq(libraryScans.id, id))
        .returning();

      return result[0] ? ScannerMapper.toDomain(result[0]) : null;
    } catch {
      return null;
    }
  }

  async count(): Promise<number> {
    const result = await this.drizzle.db.select({ count: count() }).from(libraryScans);

    return result[0]?.count ?? 0;
  }
}
