import { Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MetadataConflictService } from '../infrastructure/services/metadata-conflict.service';
import {
  GetConflictsQueryDto,
  ResolveConflictDto,
  ConflictResponseDto,
  ConflictsListResponseDto,
  ConflictResolvedResponseDto,
} from './dtos/metadata-conflicts.dto';

/**
 * MetadataConflictsController
 * Handles metadata conflict management endpoints
 *
 * Responsibilities:
 * - List pending conflicts with filters and pagination
 * - Get conflict details
 * - Accept suggested metadata changes
 * - Reject suggested changes
 * - Ignore conflicts permanently
 *
 * All endpoints require admin authentication
 */
@ApiTags('Admin - Metadata Conflicts')
@Controller('admin/metadata-conflicts')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MetadataConflictsController {
  constructor(private readonly conflictService: MetadataConflictService) {}

  /**
   * GET /admin/metadata-conflicts
   * List all pending conflicts with pagination and filters
   */
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

  /**
   * GET /admin/metadata-conflicts/:id
   * Get details of a specific conflict
   */
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
  async getConflict(@Param('id') id: string): Promise<ConflictResponseDto> {
    // Get conflicts for the entity (this will return array, we filter by ID)
    const conflicts = await this.conflictService.getPendingConflicts(0, 100);
    const conflict = conflicts.conflicts.find((c) => c.id === id);

    if (!conflict) {
      throw new Error(`Conflict ${id} not found`);
    }

    return conflict as any;
  }

  /**
   * POST /admin/metadata-conflicts/:id/accept
   * Accept a conflict and apply the suggested value
   */
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
    @Param('id') id: string,
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

  /**
   * POST /admin/metadata-conflicts/:id/reject
   * Reject a conflict (keep current value)
   */
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
    @Param('id') id: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<ConflictResolvedResponseDto> {
    await this.conflictService.rejectConflict(id, dto.userId);

    return {
      id,
      status: 'rejected',
      message: 'Conflict rejected successfully',
    };
  }

  /**
   * POST /admin/metadata-conflicts/:id/ignore
   * Ignore a conflict permanently (don't show again)
   */
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
    @Param('id') id: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<ConflictResolvedResponseDto> {
    await this.conflictService.ignoreConflict(id, dto.userId);

    return {
      id,
      status: 'ignored',
      message: 'Conflict ignored successfully',
    };
  }

  /**
   * GET /admin/metadata-conflicts/entity/:entityType/:entityId
   * Get all conflicts for a specific entity
   */
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
    @Param('entityId') entityId: string,
  ): Promise<ConflictResponseDto[]> {
    const conflicts = await this.conflictService.getConflictsForEntity(entityId, entityType as any);
    return conflicts as any[];
  }
}
