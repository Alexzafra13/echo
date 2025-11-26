import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

export interface EntityMapper<TDomain, TPersistence = any> {
  toDomain(raw: TPersistence): TDomain;
  toDomainArray(raw: TPersistence[]): TDomain[];
  toPersistence?(entity: TDomain): TPersistence;
}

export abstract class BaseRepository<TDomain, TPersistence = any> {
  protected abstract readonly drizzle: DrizzleService;
  protected abstract readonly mapper: EntityMapper<TDomain, TPersistence>;
  protected abstract readonly table: PgTable;

  async delete(id: string): Promise<boolean> {
    try {
      const idColumn = (this.table as any).id;
      if (!idColumn) {
        throw new Error('Table does not have an id column');
      }

      const result = await this.drizzle.db
        .delete(this.table)
        .where(eq(idColumn, id))
        .returning();

      return result.length > 0;
    } catch {
      return false;
    }
  }

  protected toPrimitives(entity: Partial<TDomain>): any {
    if ('toPrimitives' in entity && typeof entity.toPrimitives === 'function') {
      return entity.toPrimitives();
    }
    return entity;
  }

  protected buildUpdateData<T extends Record<string, any>>(
    primitives: T,
    fields: (keyof T)[],
  ): Partial<T> {
    const updateData: Partial<T> = {};

    for (const field of fields) {
      if (primitives[field] !== undefined) {
        updateData[field] = primitives[field];
      }
    }

    return updateData;
  }
}
