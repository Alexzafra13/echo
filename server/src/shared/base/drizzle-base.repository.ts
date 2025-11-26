import { eq } from 'drizzle-orm';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

export interface EntityMapper<TDomain, TPersistence = any> {
  toDomain(raw: TPersistence): TDomain;
  toDomainArray(raw: TPersistence[]): TDomain[];
  toPersistence?(entity: TDomain): TPersistence;
}

export abstract class DrizzleBaseRepository<TDomain, TPersistence = any> {
  protected abstract readonly drizzle: DrizzleService;
  protected abstract readonly mapper: EntityMapper<TDomain, TPersistence>;
  protected abstract readonly table: PgTableWithColumns<any>;

  async delete(id: string): Promise<boolean> {
    try {
      const idColumn = (this.table as any).id;
      if (!idColumn) {
        throw new Error('Table must have an id column for delete operation');
      }

      await this.drizzle.db
        .delete(this.table)
        .where(eq(idColumn, id));

      return true;
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
