import { eq } from 'drizzle-orm';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RepositoryError } from '@shared/errors';

/**
 * Interface for mapping between domain entities and persistence models.
 * @template TDomain - The domain entity type
 * @template TPersistence - The persistence/database model type
 */
export interface EntityMapper<TDomain, TPersistence> {
  toDomain(raw: TPersistence): TDomain;
  toDomainArray(raw: TPersistence[]): TDomain[];
  toPersistence?(entity: TDomain): TPersistence;
}

/**
 * Interface representing a table with an id column for type-safe access.
 */
interface TableWithId {
  id: ReturnType<typeof eq> extends infer R ? R : never;
}

/**
 * Base repository class for Drizzle ORM operations.
 * Provides common CRUD operations and utility methods for all repositories.
 *
 * @template TDomain - The domain entity type
 * @template TPersistence - The persistence/database model type (defaults to Record<string, unknown>)
 *
 * @example
 * ```typescript
 * export class AlbumRepository extends DrizzleBaseRepository<Album, AlbumDb> {
 *   protected readonly table = albums;
 *   protected readonly mapper = AlbumMapper;
 *
 *   constructor(protected readonly drizzle: DrizzleService) {
 *     super();
 *   }
 * }
 * ```
 */
export abstract class DrizzleBaseRepository<
  TDomain,
  TPersistence = Record<string, unknown>,
> {
  protected abstract readonly drizzle: DrizzleService;
  protected abstract readonly mapper: EntityMapper<TDomain, TPersistence>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract readonly table: PgTableWithColumns<any>;

  /**
   * Deletes an entity by its ID.
   * @param id - The unique identifier of the entity to delete
   * @returns Promise<boolean> - true if deletion was successful, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    try {
      const tableWithId = this.table as unknown as TableWithId;
      const idColumn = tableWithId.id;

      if (!idColumn) {
        throw new RepositoryError('delete', 'Table must have an id column');
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

  /**
   * Converts a domain entity to its primitive representation.
   * If the entity has a toPrimitives method, it will be used.
   * Otherwise, returns the entity as-is.
   *
   * @param entity - The domain entity or partial entity to convert
   * @returns The primitive representation of the entity
   */
  protected toPrimitives(
    entity: Partial<TDomain>,
  ): TPersistence | Partial<TDomain> {
    if (
      entity &&
      'toPrimitives' in entity &&
      typeof entity.toPrimitives === 'function'
    ) {
      return entity.toPrimitives() as TPersistence;
    }
    return entity;
  }

  /**
   * Builds an update data object from primitives, including only specified fields
   * that have defined values.
   *
   * @template T - The type of the primitives object
   * @param primitives - The source object containing potential update values
   * @param fields - Array of field names to include in the update
   * @returns Partial<T> - Object containing only the specified fields with defined values
   *
   * @example
   * ```typescript
   * const updateData = this.buildUpdateData(
   *   { name: 'New Name', description: undefined, active: true },
   *   ['name', 'description', 'active']
   * );
   * // Result: { name: 'New Name', active: true }
   * ```
   */
  protected buildUpdateData<T extends Record<string, unknown>>(
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
