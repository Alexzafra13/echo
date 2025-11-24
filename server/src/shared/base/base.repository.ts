import { PrismaService } from '../../infrastructure/persistence/prisma.service';

export interface EntityMapper<TDomain, TPersistence = any> {
  toDomain(raw: TPersistence): TDomain;
  toDomainArray(raw: TPersistence[]): TDomain[];
  toPersistence?(entity: TDomain): TPersistence;
}

export abstract class BaseRepository<TDomain, TPersistence = any> {
  protected abstract readonly prisma: PrismaService;
  protected abstract readonly mapper: EntityMapper<TDomain, TPersistence>;
  protected abstract readonly modelDelegate: any;

  async delete(id: string): Promise<boolean> {
    const result = await this.modelDelegate
      .delete({ where: { id } })
      .catch(() => null);

    return result !== null;
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
