import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings.service';
import { MetadataConflictService, ConflictPriority } from '../metadata-conflict.service';
import type { MbidMatch } from './mbid-search-executor.service';
import type { EntityType } from '../conflicts/conflict-enrichment.service';

/**
 * MBID search result with action recommendation
 */
export interface MbidSearchResult {
  topMatch: MbidMatch | null;
  suggestions: MbidMatch[];
  action: 'auto-apply' | 'create-conflict' | 'ignore';
  reason?: string;
}

/**
 * Conflict creation parameters
 */
export interface ConflictParams {
  entityId: string;
  entityType: EntityType;
  currentValue: string;
  metadata: Record<string, any>;
}

/**
 * Service for MBID confidence-based decision making
 * Determines whether to auto-apply, create conflict, or ignore based on score
 */
@Injectable()
export class MbidConfidenceStrategyService {
  private readonly logger = new Logger(MbidConfidenceStrategyService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly conflictService: MetadataConflictService,
  ) {}

  /**
   * Check if auto-search is enabled
   */
  async isEnabled(): Promise<boolean> {
    return this.settingsService.getBoolean('metadata.auto_search_mbid.enabled', false);
  }

  /**
   * Get confidence threshold from settings
   */
  async getConfidenceThreshold(): Promise<number> {
    return this.settingsService.getNumber('metadata.auto_search_mbid.confidence_threshold', 95);
  }

  /**
   * Determine action based on matches and confidence
   */
  async determineAction(
    matches: MbidMatch[],
    entityName: string,
  ): Promise<MbidSearchResult> {
    if (!matches || matches.length === 0) {
      return {
        topMatch: null,
        suggestions: [],
        action: 'ignore',
        reason: 'No matches found in MusicBrainz',
      };
    }

    const topMatch = matches[0];
    const confidenceThreshold = await this.getConfidenceThreshold();

    if (topMatch.score >= confidenceThreshold) {
      return {
        topMatch,
        suggestions: matches,
        action: 'auto-apply',
        reason: `High confidence match (score: ${topMatch.score})`,
      };
    } else if (topMatch.score >= 75) {
      return {
        topMatch,
        suggestions: matches,
        action: 'create-conflict',
        reason: `Medium confidence match (score: ${topMatch.score}) - user review needed`,
      };
    }

    return {
      topMatch,
      suggestions: matches,
      action: 'ignore',
      reason: `Low confidence match (score: ${topMatch.score})`,
    };
  }

  /**
   * Create a conflict for medium-confidence matches
   */
  async createMbidConflict(
    params: ConflictParams,
    result: MbidSearchResult,
  ): Promise<void> {
    if (!result.topMatch) return;

    this.logger.log(
      `Creating MBID conflict for ${params.entityType} "${params.currentValue}" with ${result.suggestions.length} suggestions`,
    );

    await this.conflictService.createConflict({
      entityId: params.entityId,
      entityType: params.entityType,
      field: 'artistName', // Used for MBID suggestions
      currentValue: params.currentValue,
      suggestedValue: result.topMatch.name,
      source: 'musicbrainz',
      priority: ConflictPriority.MEDIUM,
      metadata: {
        conflictType: 'mbid-suggestion',
        ...params.metadata,
        suggestions: result.suggestions,
        autoSearched: true,
      },
    });
  }

  /**
   * Build result for disabled state
   */
  buildDisabledResult(): MbidSearchResult {
    return {
      topMatch: null,
      suggestions: [],
      action: 'ignore',
      reason: 'Auto-search MBID disabled in settings',
    };
  }

  /**
   * Build result for error state
   */
  buildErrorResult(error: Error): MbidSearchResult {
    return {
      topMatch: null,
      suggestions: [],
      action: 'ignore',
      reason: `Error: ${error.message}`,
    };
  }
}
