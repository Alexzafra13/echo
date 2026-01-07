import { Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus, UseGuards, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MetadataConflictService } from '../infrastructure/services/metadata-conflict.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { metadataConflicts, artists, albums, tracks } from '@infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@shared/errors';
import {
  GetConflictsQueryDto,
  ResolveConflictDto,
  ConflictResponseDto,
  ConflictsListResponseDto,
  ConflictResolvedResponseDto,
} from './dtos/metadata-conflicts.dto';

// Gestión de conflictos de metadata: aceptar/rechazar/ignorar sugerencias
@ApiTags('Admin - Metadata Conflicts')
@Controller('admin/metadata-conflicts')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MetadataConflictsController {
  constructor(
    private readonly conflictService: MetadataConflictService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List pending metadata conflicts',
    description: 'Retrieve paginated list of pending conflicts with optional filters by entity type, source, or priority',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conflicts retrieved successfully',
    type: ConflictsListResponseDto,
  })
  async listConflicts(@Query() query: GetConflictsQueryDto): Promise<ConflictsListResponseDto> {
    const { skip = 0, take = 20, entityType, source, priority } = query;

    // Clean up orphaned conflicts first (conflicts for deleted entities)
    await this.conflictService.cleanupOrphanedConflicts();

    const result = await this.conflictService.getPendingConflicts(skip, take, {
      entityType: entityType as any,
      source: source as any,
      priority,
    });

    return {
      conflicts: result.conflicts as any[],
      total: result.total,
      skip,
      take,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get conflict details',
    description: 'Retrieve detailed information about a specific metadata conflict',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflict details retrieved successfully',
    type: ConflictResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Conflict not found',
  })
  async getConflict(@Param('id', ParseUUIDPipe) id: string): Promise<ConflictResponseDto> {
    // Get conflicts for the entity (this will return array, we filter by ID)
    const conflicts = await this.conflictService.getPendingConflicts(0, 100);
    const conflict = conflicts.conflicts.find((c) => c.id === id);

    if (!conflict) {
      throw new NotFoundError('MetadataConflict', id);
    }

    return conflict as any;
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept metadata suggestion',
    description: 'Accept the suggested value and apply it to the entity. MusicBrainz suggestions are auto-applied.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflict accepted and changes applied successfully',
    type: ConflictResolvedResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Conflict not found',
  })
  async acceptConflict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<ConflictResolvedResponseDto> {
    const updatedEntity = await this.conflictService.acceptConflict(id, dto.userId);

    return {
      id,
      status: 'accepted',
      message: 'Conflict accepted and changes applied successfully',
      updatedEntity,
    };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject metadata suggestion',
    description: 'Reject the suggested value and keep the current metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflict rejected successfully',
    type: ConflictResolvedResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Conflict not found',
  })
  async rejectConflict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<ConflictResolvedResponseDto> {
    await this.conflictService.rejectConflict(id, dto.userId);

    return {
      id,
      status: 'rejected',
      message: 'Conflict rejected successfully',
    };
  }

  @Post(':id/ignore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ignore metadata suggestion',
    description: 'Mark conflict as ignored - will not appear in pending list anymore',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflict ignored successfully',
    type: ConflictResolvedResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Conflict not found',
  })
  async ignoreConflict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<ConflictResolvedResponseDto> {
    await this.conflictService.ignoreConflict(id, dto.userId);

    return {
      id,
      status: 'ignored',
      message: 'Conflict ignored successfully',
    };
  }

  @Get('entity/:entityType/:entityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get conflicts for specific entity',
    description: 'Retrieve all pending conflicts for a specific album, artist, or track',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflicts for entity retrieved successfully',
    type: [ConflictResponseDto],
  })
  async getEntityConflicts(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<ConflictResponseDto[]> {
    const conflicts = await this.conflictService.getConflictsForEntity(entityId, entityType as any);
    return conflicts as any[];
  }

  // Aplica una sugerencia específica (para conflictos con múltiples opciones de MBID)
  @Post(':id/apply-suggestion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply specific MBID suggestion',
    description:
      'For conflicts with multiple MBID suggestions (Picard-style), apply a specific suggestion by index',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        suggestionIndex: {
          type: 'number',
          description: 'Index of the suggestion to apply (0-based)',
          example: 0,
        },
        userId: {
          type: 'string',
          description: 'User ID who is applying the suggestion',
          example: 'user-123',
        },
      },
      required: ['suggestionIndex'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestion applied successfully',
    type: ConflictResolvedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid suggestion index or conflict not found',
  })
  async applySuggestion(
    @Param('id', ParseUUIDPipe) conflictId: string,
    @Body() body: { suggestionIndex: number; userId?: string },
  ): Promise<ConflictResolvedResponseDto> {
    // Get the conflict
    const conflictResult = await this.drizzle.db
      .select()
      .from(metadataConflicts)
      .where(eq(metadataConflicts.id, conflictId))
      .limit(1);
    const conflict = conflictResult[0];

    if (!conflict) {
      throw new BadRequestException(`Conflict ${conflictId} not found`);
    }

    if (conflict.status !== 'pending') {
      throw new BadRequestException(`Conflict ${conflictId} is already ${conflict.status}`);
    }

    // Get metadata (already parsed as JSONB)
    const metadata = conflict.metadata ? (conflict.metadata as Record<string, any>) : null;

    if (!metadata || !metadata.suggestions || !Array.isArray(metadata.suggestions)) {
      throw new BadRequestException(
        'This conflict does not have multiple suggestions. Use /accept endpoint instead.',
      );
    }

    const { suggestionIndex } = body;

    if (
      suggestionIndex < 0 ||
      suggestionIndex >= metadata.suggestions.length ||
      !Number.isInteger(suggestionIndex)
    ) {
      throw new BadRequestException(
        `Invalid suggestion index: ${suggestionIndex}. Must be between 0 and ${metadata.suggestions.length - 1}`,
      );
    }

    // Get the selected suggestion
    const selectedSuggestion = metadata.suggestions[suggestionIndex];

    // Apply MBID based on entity type
    let updatedEntity;
    switch (conflict.entityType) {
      case 'artist':
        const artistResult = await this.drizzle.db
          .update(artists)
          .set({ mbzArtistId: selectedSuggestion.mbid })
          .where(eq(artists.id, conflict.entityId))
          .returning();
        updatedEntity = artistResult[0];
        break;

      case 'album':
        const albumResult = await this.drizzle.db
          .update(albums)
          .set({
            mbzAlbumId: selectedSuggestion.mbid,
            mbzAlbumArtistId: selectedSuggestion.details?.artistMbid || undefined,
          })
          .where(eq(albums.id, conflict.entityId))
          .returning();
        updatedEntity = albumResult[0];
        break;

      case 'track':
        const trackResult = await this.drizzle.db
          .update(tracks)
          .set({
            mbzTrackId: selectedSuggestion.mbid,
            mbzArtistId: selectedSuggestion.details?.artistMbid || undefined,
          })
          .where(eq(tracks.id, conflict.entityId))
          .returning();
        updatedEntity = trackResult[0];
        break;

      default:
        throw new BadRequestException(`Unsupported entity type: ${conflict.entityType}`);
    }

    // Mark conflict as accepted
    await this.drizzle.db
      .update(metadataConflicts)
      .set({
        status: 'accepted',
        resolvedAt: new Date(),
        resolvedBy: body.userId || 'admin',
        // Update suggested value to show which one was selected
        suggestedValue: selectedSuggestion.name,
        metadata: {
          ...metadata,
          selectedSuggestionIndex: suggestionIndex,
          selectedSuggestion,
        },
      })
      .where(eq(metadataConflicts.id, conflictId));

    return {
      id: conflictId,
      status: 'accepted',
      message: `Applied suggestion #${suggestionIndex}: "${selectedSuggestion.name}" (score: ${selectedSuggestion.score})`,
      updatedEntity,
    };
  }
}
