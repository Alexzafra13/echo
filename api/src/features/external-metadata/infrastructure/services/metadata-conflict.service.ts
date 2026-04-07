import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  metadataConflicts,
  type MetadataConflict,
  type NewMetadataConflict,
} from '@infrastructure/database/schema';
import { NotFoundError, ConflictError } from '@shared/errors';
import { ConflictChangeApplierService } from './conflicts/conflict-change-applier.service';
import {
  ConflictEnrichmentService,
  ConflictWithEntity,
  EntityType,
  ConflictField,
  ConflictSource,
  ConflictStatus,
} from './conflicts/conflict-enrichment.service';

// Re-export types for backwards compatibility
export type { EntityType, ConflictField, ConflictSource, ConflictStatus, ConflictWithEntity };

/**
 * Priority levels for conflicts
 */
export enum ConflictPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

/**
 * Interface for creating a new conflict
 */
export interface CreateConflictDto {
  entityId: string;
  entityType: EntityType;
  field: ConflictField;
  currentValue?: string;
  suggestedValue: string;
  source: ConflictSource;
  priority?: ConflictPriority;
  metadata?: Record<string, unknown>;
}

/**
 * MetadataConflictService - Orchestrator for metadata conflict management
 *
 * Responsibilities:
 * - CRUD operations for conflicts
 * - Conflict resolution workflow
 *
 * Delegates to:
 * - ConflictChangeApplierService: applies changes to entities
 * - ConflictEnrichmentService: enriches conflicts with entity data
 */
@Injectable()
export class MetadataConflictService {
  constructor(
    @InjectPinoLogger(MetadataConflictService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly changeApplier: ConflictChangeApplierService,
    private readonly enrichment: ConflictEnrichmentService
  ) {}

  /**
   * Create a new metadata conflict
   * For cover images, only keeps the highest resolution suggestion
   */
  async createConflict(data: CreateConflictDto): Promise<ConflictWithEntity> {
    // Handle cover image deduplication
    if (data.field === 'externalCover' || data.field === 'cover') {
      const existing = await this.findExistingCoverConflict(data);
      if (existing) {
        return this.handleExistingCoverConflict(existing, data);
      }
    } else {
      // For non-cover fields: don't create duplicate pending conflicts
      const existing = await this.findExistingConflict(data);
      if (existing) {
        this.logger.debug(
          `Conflict already exists for ${data.entityType} ${data.entityId}, field ${data.field}`
        );
        return this.enrichment.mapConflictWithEntity(existing);
      }
    }

    return this.insertNewConflict(data);
  }

  /**
   * Get all pending conflicts with pagination
   */
  async getPendingConflicts(
    skip = 0,
    take = 20,
    filters?: {
      entityType?: EntityType;
      source?: ConflictSource;
      priority?: ConflictPriority;
    }
  ): Promise<{ conflicts: ConflictWithEntity[]; total: number }> {
    const conditions = [eq(metadataConflicts.status, 'pending')];

    if (filters?.entityType) {
      conditions.push(eq(metadataConflicts.entityType, filters.entityType));
    }
    if (filters?.source) {
      conditions.push(eq(metadataConflicts.source, filters.source));
    }
    if (filters?.priority) {
      conditions.push(eq(metadataConflicts.priority, filters.priority));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [conflicts, totalResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(metadataConflicts)
        .where(whereClause)
        .orderBy(desc(metadataConflicts.priority), desc(metadataConflicts.createdAt))
        .limit(take)
        .offset(skip),
      this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(metadataConflicts)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;
    const conflictsWithEntities = await this.enrichment.enrichConflicts(conflicts);

    return { conflicts: conflictsWithEntities, total };
  }

  /**
   * Get conflicts for a specific entity
   */
  async getConflictsForEntity(
    entityId: string,
    entityType: EntityType
  ): Promise<ConflictWithEntity[]> {
    const conflicts = await this.drizzle.db
      .select()
      .from(metadataConflicts)
      .where(
        and(
          eq(metadataConflicts.entityId, entityId),
          eq(metadataConflicts.entityType, entityType),
          eq(metadataConflicts.status, 'pending')
        )
      )
      .orderBy(desc(metadataConflicts.priority));

    return this.enrichment.enrichConflicts(conflicts);
  }

  /**
   * Accept a conflict and apply the suggested value
   */
  async acceptConflict(conflictId: string, userId?: string): Promise<unknown> {
    const conflict = await this.getConflictById(conflictId);

    if (!conflict) {
      throw new NotFoundError('MetadataConflict', conflictId);
    }

    if (conflict.status !== 'pending') {
      throw new ConflictError(`Conflict ${conflictId} is already ${conflict.status}`);
    }

    // Verify entity exists
    const entityExists = await this.enrichment.verifyEntityExists(
      conflict.entityType as EntityType,
      conflict.entityId
    );

    if (!entityExists) {
      await this.rejectOrphanedConflict(conflictId, conflict);
      throw new NotFoundError(conflict.entityType, `${conflict.entityId} (conflict auto-rejected)`);
    }

    // Apply the change
    let updatedEntity;
    try {
      updatedEntity = await this.changeApplier.applyChange({
        entityId: conflict.entityId,
        entityType: conflict.entityType as EntityType,
        field: conflict.field,
        suggestedValue: conflict.suggestedValue,
        source: conflict.source,
        metadata: conflict.metadata as Record<string, unknown> | undefined,
      });
    } catch (error) {
      this.logger.error(`Error applying conflict ${conflictId}: ${(error as Error).message}`);
      throw error;
    }

    // Mark conflict as accepted
    await this.updateConflictStatus(conflictId, 'accepted', userId);

    this.logger.info(
      `Accepted conflict ${conflictId}: ${conflict.field} for ${conflict.entityType} ${conflict.entityId}`
    );

    return updatedEntity;
  }

  /**
   * Reject a conflict (keep current value)
   */
  async rejectConflict(conflictId: string, userId?: string): Promise<void> {
    await this.updateConflictStatus(conflictId, 'rejected', userId);
    this.logger.info(`Rejected conflict ${conflictId}`);
  }

  /**
   * Ignore a conflict (don't show again for this field/source)
   */
  async ignoreConflict(conflictId: string, userId?: string): Promise<void> {
    await this.updateConflictStatus(conflictId, 'ignored', userId);
    this.logger.info(`Ignored conflict ${conflictId}`);
  }

  /**
   * Clean up orphaned conflicts
   */
  async cleanupOrphanedConflicts(): Promise<number> {
    return this.enrichment.cleanupOrphanedConflicts();
  }

  /**
   * Check if updating a field would create a conflict
   */
  hasConflict(currentValue: unknown, newValue: unknown): boolean {
    if (!currentValue && !newValue) return false;
    if (!currentValue && newValue) return false; // Allow filling empty fields
    if (currentValue && !newValue) return false; // Ignore if new is empty
    return currentValue !== newValue;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async getConflictById(conflictId: string): Promise<MetadataConflict | null> {
    const results = await this.drizzle.db
      .select()
      .from(metadataConflicts)
      .where(eq(metadataConflicts.id, conflictId))
      .limit(1);
    return results[0] || null;
  }

  private async findExistingCoverConflict(
    data: CreateConflictDto
  ): Promise<MetadataConflict | null> {
    const results = await this.drizzle.db
      .select()
      .from(metadataConflicts)
      .where(
        and(
          eq(metadataConflicts.entityId, data.entityId),
          eq(metadataConflicts.field, data.field),
          eq(metadataConflicts.status, 'pending')
        )
      )
      .limit(1);
    return results[0] || null;
  }

  private async findExistingConflict(data: CreateConflictDto): Promise<MetadataConflict | null> {
    const results = await this.drizzle.db
      .select()
      .from(metadataConflicts)
      .where(
        and(
          eq(metadataConflicts.entityId, data.entityId),
          eq(metadataConflicts.field, data.field),
          eq(metadataConflicts.source, data.source),
          eq(metadataConflicts.status, 'pending')
        )
      )
      .limit(1);
    return results[0] || null;
  }

  private async handleExistingCoverConflict(
    existing: MetadataConflict,
    data: CreateConflictDto
  ): Promise<ConflictWithEntity> {
    const existingMeta = existing.metadata ? (existing.metadata as Record<string, unknown>) : {};
    const newMeta = data.metadata || {};

    if (this.shouldReplaceConflict(existingMeta, newMeta)) {
      const priority = this.determinePriority(data);

      const updateData: Partial<NewMetadataConflict> = {
        suggestedValue: data.suggestedValue,
        source: data.source,
        priority,
      };

      if (data.metadata) {
        updateData.metadata = data.metadata;
      }

      const updatedResults = await this.drizzle.db
        .update(metadataConflicts)
        .set(updateData)
        .where(eq(metadataConflicts.id, existing.id))
        .returning();

      this.logger.info(
        `Updated conflict ${existing.id} with better resolution: ${newMeta.suggestedResolution} from ${data.source}`
      );

      return this.enrichment.mapConflictWithEntity(updatedResults[0]);
    }

    this.logger.debug(
      `Keeping existing conflict for ${data.entityType} ${data.entityId}: existing resolution is better`
    );
    return this.enrichment.mapConflictWithEntity(existing);
  }

  private shouldReplaceConflict(
    existingMeta: Record<string, unknown>,
    newMeta: Record<string, unknown>
  ): boolean {
    const existingRes = existingMeta.suggestedResolution as string | undefined;
    const newRes = newMeta.suggestedResolution as string | undefined;

    if (!existingRes || !newRes || newRes === 'Desconocida') {
      return false;
    }

    const parseResolution = (res: string): number => {
      const parts = res.split('×');
      if (parts.length !== 2) return 0;
      return parseInt(parts[0], 10) * parseInt(parts[1], 10);
    };

    return parseResolution(newRes) > parseResolution(existingRes);
  }

  private async insertNewConflict(data: CreateConflictDto): Promise<ConflictWithEntity> {
    const priority = this.determinePriority(data);

    const insertData: NewMetadataConflict = {
      entityId: data.entityId,
      entityType: data.entityType,
      field: data.field,
      suggestedValue: data.suggestedValue,
      source: data.source,
      priority,
    };

    if (data.currentValue !== undefined) {
      insertData.currentValue = data.currentValue;
    }

    if (data.metadata) {
      insertData.metadata = data.metadata;
    }

    const results = await this.drizzle.db.insert(metadataConflicts).values(insertData).returning();

    this.logger.info(
      `Created ${priority === ConflictPriority.HIGH ? 'HIGH' : 'MEDIUM'} priority conflict for ${data.entityType} ${data.entityId}: ${data.field} (source: ${data.source})`
    );

    return this.enrichment.mapConflictWithEntity(results[0]);
  }

  private determinePriority(data: CreateConflictDto): ConflictPriority {
    return (
      data.priority ??
      (data.source === 'musicbrainz' || data.source === 'coverartarchive'
        ? ConflictPriority.HIGH
        : ConflictPriority.MEDIUM)
    );
  }

  private async updateConflictStatus(
    conflictId: string,
    status: ConflictStatus,
    userId?: string
  ): Promise<void> {
    await this.drizzle.db
      .update(metadataConflicts)
      .set({
        status,
        resolvedAt: new Date(),
        resolvedBy: userId,
      })
      .where(eq(metadataConflicts.id, conflictId));
  }

  private async rejectOrphanedConflict(
    conflictId: string,
    conflict: MetadataConflict
  ): Promise<void> {
    await this.drizzle.db
      .update(metadataConflicts)
      .set({
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedBy: 'system',
      })
      .where(eq(metadataConflicts.id, conflictId));

    this.logger.warn(
      `Conflict ${conflictId} rejected automatically: ${conflict.entityType} ${conflict.entityId} no longer exists`
    );
  }
}
