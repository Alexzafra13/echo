import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Req,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../../shared/types/request.types';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { tracks, djAnalysis, djStems } from '../../../../infrastructure/database/schema';
import { eq, inArray } from 'drizzle-orm';

import { DjAnalysisQueueService } from '../../infrastructure/services/dj-analysis-queue.service';
import { StemQueueService } from '../../infrastructure/services/stem-queue.service';
import { TransitionEngineService } from '../../infrastructure/services/transition-engine.service';
import { DrizzleDjAnalysisRepository } from '../../infrastructure/persistence/dj-analysis.repository';
import { DrizzleDjSessionRepository } from '../../infrastructure/persistence/dj-session.repository';
import { GetDjSuggestionsUseCase } from '../../application/use-cases/get-dj-suggestions.use-case';
import { DjCompatibilityService } from '../../domain/services/dj-compatibility.service';

import {
  AnalyzeTrackRequestDto,
  AnalyzePlaylistRequestDto,
  ProcessStemsRequestDto,
  GetCompatibleTracksRequestDto,
  CalculateTransitionRequestDto,
  DjAnalysisResponseDto,
  StemsStatusResponseDto,
  TrackCompatibilityDto,
  TransitionResponseDto,
  DjQueueStatusResponseDto,
  CreateDjSessionRequestDto,
  UpdateDjSessionRequestDto,
  AddTrackToSessionRequestDto,
  DjSessionResponseDto,
  DjSessionListResponseDto,
  DjSessionTrackDto,
} from '../dtos/dj.dto';

@ApiTags('DJ')
@ApiBearerAuth()
@Controller('dj')
@UseGuards(JwtAuthGuard)
export class DjController {
  constructor(
    @InjectPinoLogger(DjController.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly analysisQueue: DjAnalysisQueueService,
    private readonly stemQueue: StemQueueService,
    private readonly transitionEngine: TransitionEngineService,
    private readonly djAnalysisRepository: DrizzleDjAnalysisRepository,
    private readonly djSessionRepository: DrizzleDjSessionRepository,
    private readonly getDjSuggestionsUseCase: GetDjSuggestionsUseCase,
    private readonly compatibilityService: DjCompatibilityService,
  ) {}

  // ============================================
  // Analysis Endpoints
  // ============================================

  @Post('analyze/track/:trackId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Analyze a single track for DJ features (BPM, Key, etc.)' })
  @ApiResponse({ status: 202, description: 'Analysis queued' })
  async analyzeTrack(@Param('trackId', ParseUUIDPipe) trackId: string): Promise<{ message: string }> {
    const track = await this.drizzle.db
      .select()
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (!track[0]) {
      throw new Error('Track not found');
    }

    await this.analysisQueue.enqueueTrack({
      id: track[0].id,
      title: track[0].title,
      path: track[0].path,
    });

    return { message: 'Track analysis queued' };
  }

  @Post('analyze/playlist')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Analyze all tracks in a playlist' })
  async analyzePlaylist(@Body() dto: AnalyzePlaylistRequestDto): Promise<{ message: string; trackCount: number }> {
    // Get playlist tracks
    const playlistTracks = await this.drizzle.db.query.playlistTracks.findMany({
      where: (pt, { eq }) => eq(pt.playlistId, dto.playlistId),
      with: { track: true },
    });

    const tracksToAnalyze = playlistTracks
      .filter((pt) => pt.track)
      .map((pt) => ({
        id: pt.track.id,
        title: pt.track.title,
        path: pt.track.path,
      }));

    await this.analysisQueue.startAnalysisQueueForTracks(tracksToAnalyze);

    if (dto.processStems) {
      await this.stemQueue.startStemQueue(tracksToAnalyze);
    }

    return {
      message: 'Playlist analysis started',
      trackCount: tracksToAnalyze.length,
    };
  }

  @Get('analysis/:trackId')
  @ApiOperation({ summary: 'Get DJ analysis for a track' })
  @ApiResponse({ status: 200, type: DjAnalysisResponseDto })
  async getAnalysis(
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ): Promise<DjAnalysisResponseDto | null> {
    const analysis = await this.djAnalysisRepository.findByTrackId(trackId);

    if (!analysis) {
      return null;
    }

    return {
      id: analysis.id,
      trackId: analysis.trackId,
      bpm: analysis.bpm,
      key: analysis.key,
      camelotKey: analysis.camelotKey,
      energy: analysis.energy,
      danceability: analysis.danceability,
      status: analysis.status,
      analyzedAt: analysis.analyzedAt,
    };
  }

  @Get('suggestions/:trackId')
  @ApiOperation({ summary: 'Get DJ track suggestions based on harmonic mixing and BPM compatibility' })
  @ApiResponse({ status: 200, description: 'List of compatible tracks with scores' })
  async getSuggestions(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Query('limit') limit?: number,
    @Query('minScore') minScore?: number,
    @Query('prioritize') prioritize?: 'bpm' | 'key' | 'energy' | 'balanced',
  ) {
    const result = await this.getDjSuggestionsUseCase.execute(trackId, {
      limit: limit ? parseInt(String(limit), 10) : undefined,
      minScore: minScore ? parseInt(String(minScore), 10) : undefined,
      prioritize: prioritize || 'balanced',
    });

    if (!result) {
      return { currentTrack: null, suggestions: [], compatibleKeys: [] };
    }

    return result;
  }

  // ============================================
  // Stems Endpoints
  // ============================================

  @Post('stems/process')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Process stems for a track (requires stem separator)' })
  async processStems(@Body() dto: ProcessStemsRequestDto): Promise<{ message: string }> {
    const track = await this.drizzle.db
      .select()
      .from(tracks)
      .where(eq(tracks.id, dto.trackId))
      .limit(1);

    if (!track[0]) {
      throw new Error('Track not found');
    }

    await this.stemQueue.enqueueTrack({
      id: track[0].id,
      title: track[0].title,
      path: track[0].path,
    });

    return { message: 'Stem processing queued' };
  }

  @Get('stems/:trackId')
  @ApiOperation({ summary: 'Get stems status for a track' })
  @ApiResponse({ status: 200, type: StemsStatusResponseDto })
  async getStemsStatus(
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ): Promise<StemsStatusResponseDto> {
    const stems = await this.drizzle.db
      .select()
      .from(djStems)
      .where(eq(djStems.trackId, trackId))
      .limit(1);

    if (!stems[0]) {
      return {
        trackId,
        status: 'not_processed',
        hasStems: false,
      };
    }

    return {
      trackId,
      status: stems[0].status,
      hasStems: stems[0].status === 'completed',
      modelUsed: stems[0].modelUsed || undefined,
      totalSizeMB: stems[0].totalSizeBytes
        ? Math.round(stems[0].totalSizeBytes / 1024 / 1024)
        : undefined,
      processedAt: stems[0].processedAt || undefined,
    };
  }

  // ============================================
  // Compatibility Endpoints
  // ============================================

  @Get('compatible/:trackId')
  @ApiOperation({ summary: 'Find tracks compatible with a given track' })
  @ApiResponse({ status: 200, type: [TrackCompatibilityDto] })
  async getCompatibleTracks(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Query('bpmTolerance') bpmTolerance?: number,
    @Query('limit') limit?: number,
  ): Promise<TrackCompatibilityDto[]> {
    const sourceAnalysis = await this.djAnalysisRepository.findByTrackId(trackId);
    if (!sourceAnalysis) {
      return [];
    }

    const compatible = await this.djAnalysisRepository.findCompatibleTracks(
      trackId,
      {
        bpmTolerance,
        limit,
      },
    );

    // Get track details
    const trackIds = compatible.map((a) => a.trackId);
    const trackDetails = await this.drizzle.db
      .select()
      .from(tracks)
      .where(inArray(tracks.id, trackIds));

    const trackMap = new Map(trackDetails.map((t) => [t.id, t]));

    // Get stems status
    const stemsStatus = await this.drizzle.db
      .select()
      .from(djStems)
      .where(inArray(djStems.trackId, trackIds));

    const stemsMap = new Map(stemsStatus.map((s) => [s.trackId, s]));

    // Calculate compatibility scores
    return compatible.map((analysis) => {
      const track = trackMap.get(analysis.trackId);
      const stems = stemsMap.get(analysis.trackId);
      const sourceStems = stemsMap.get(trackId);

      const compatibility = this.transitionEngine.calculateCompatibility(
        sourceAnalysis,
        analysis,
        sourceStems ? { isProcessed: () => sourceStems.status === 'completed' } as any : undefined,
        stems ? { isProcessed: () => stems.status === 'completed' } as any : undefined,
      );

      return {
        trackId: analysis.trackId,
        title: track?.title || 'Unknown',
        artist: track?.artistName || 'Unknown',
        bpm: analysis.bpm,
        key: analysis.key,
        camelotKey: analysis.camelotKey,
        harmonicScore: compatibility.harmonicScore,
        bpmDifference: compatibility.bpmDifference,
        overallScore: compatibility.overallScore,
        recommendedTransition: compatibility.recommendedTransition,
        canMashup: compatibility.canMashup,
      };
    });
  }

  // ============================================
  // Transition Endpoints
  // ============================================

  @Post('transition/calculate')
  @ApiOperation({ summary: 'Calculate transition parameters between two tracks' })
  @ApiResponse({ status: 200, type: TransitionResponseDto })
  async calculateTransition(
    @Body() dto: CalculateTransitionRequestDto,
  ): Promise<TransitionResponseDto> {
    const [analysisA, analysisB] = await Promise.all([
      this.djAnalysisRepository.findByTrackId(dto.trackAId),
      this.djAnalysisRepository.findByTrackId(dto.trackBId),
    ]);

    if (!analysisA || !analysisB) {
      throw new Error('Both tracks must be analyzed first');
    }

    const transition = this.transitionEngine.calculateTransition(
      analysisA,
      analysisB,
      {
        type: dto.type,
        durationBeats: dto.durationBeats,
        useStems: false,
      },
    );

    return {
      type: transition.type,
      startTimeA: transition.startTimeA,
      startTimeB: transition.startTimeB,
      duration: transition.duration,
      bpmAdjustment: transition.bpmAdjustment,
      description: transition.description,
    };
  }

  // ============================================
  // Status Endpoints
  // ============================================

  @Get('status')
  @ApiOperation({ summary: 'Get DJ processing queue status' })
  @ApiResponse({ status: 200, type: DjQueueStatusResponseDto })
  async getQueueStatus(): Promise<DjQueueStatusResponseDto> {
    const [analysisStatus, stemStatus] = await Promise.all([
      this.analysisQueue.getQueueStats(),
      this.stemQueue.getQueueStats(),
    ]);

    return {
      analysis: {
        isRunning: analysisStatus.isRunning,
        pendingTracks: analysisStatus.pendingTracks,
        processedInSession: analysisStatus.processedInSession,
        concurrency: analysisStatus.concurrency,
        backend: analysisStatus.analyzerBackend,
      },
      stems: {
        isRunning: stemStatus.isRunning,
        pendingTracks: stemStatus.pendingTracks,
        processedInSession: stemStatus.processedInSession,
        concurrency: stemStatus.concurrency,
        backend: stemStatus.separatorBackend,
        isAvailable: stemStatus.isAvailable,
      },
    };
  }

  // ============================================
  // DJ Sessions Endpoints
  // ============================================

  @Get('sessions')
  @ApiOperation({ summary: 'Get all DJ sessions for current user' })
  @ApiResponse({ status: 200, type: DjSessionListResponseDto })
  async getSessions(@Req() req: RequestWithUser): Promise<DjSessionListResponseDto> {
    const sessions = await this.djSessionRepository.findByUserId(req.user.id);

    // Enrich with track info
    const enrichedSessions = await Promise.all(
      sessions.map(session => this.enrichSessionWithTracks(session))
    );

    return {
      sessions: enrichedSessions,
      total: sessions.length,
    };
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new DJ session' })
  @ApiResponse({ status: 201, type: DjSessionResponseDto })
  async createSession(
    @Req() req: RequestWithUser,
    @Body() dto: CreateDjSessionRequestDto,
  ): Promise<DjSessionResponseDto> {
    // Get DJ analysis for all tracks to include metadata
    const trackAnalyses = await this.getTrackAnalyses(dto.trackIds);

    // Build track list with DJ metadata and compatibility scores
    const trackList = dto.trackIds.map((trackId, index) => {
      const analysis = trackAnalyses.get(trackId);
      let compatibilityScore: number | undefined;

      // Calculate compatibility with previous track
      if (index > 0) {
        const prevTrackId = dto.trackIds[index - 1];
        const prevAnalysis = trackAnalyses.get(prevTrackId);
        if (analysis && prevAnalysis) {
          compatibilityScore = this.compatibilityService.calculateCompatibility(
            this.toTrackDjData(prevAnalysis),
            this.toTrackDjData(analysis),
          ).overall;
        }
      }

      return {
        trackId,
        order: index,
        bpm: analysis?.bpm ?? undefined,
        camelotKey: analysis?.camelotKey ?? undefined,
        energy: analysis?.energy ?? undefined,
        compatibilityScore,
      };
    });

    const session = await this.djSessionRepository.create({
      userId: req.user.id,
      name: dto.name,
      transitionType: dto.transitionType as 'crossfade' | 'mashup' | 'cut' | undefined,
      transitionDuration: dto.transitionDuration,
      trackList,
    });

    return this.enrichSessionWithTracks(session);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a specific DJ session' })
  @ApiResponse({ status: 200, type: DjSessionResponseDto })
  async getSession(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DjSessionResponseDto> {
    const session = await this.djSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== req.user.id) {
      throw new ForbiddenException('Not your session');
    }

    return this.enrichSessionWithTracks(session);
  }

  @Put('sessions/:id')
  @ApiOperation({ summary: 'Update a DJ session' })
  @ApiResponse({ status: 200, type: DjSessionResponseDto })
  async updateSession(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDjSessionRequestDto,
  ): Promise<DjSessionResponseDto> {
    const session = await this.djSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== req.user.id) {
      throw new ForbiddenException('Not your session');
    }

    // If reordering tracks, recalculate compatibility scores
    let trackList = session.trackList;
    if (dto.trackIds) {
      const trackAnalyses = await this.getTrackAnalyses(dto.trackIds);
      trackList = dto.trackIds.map((trackId, index) => {
        const existing = session.trackList.find(t => t.trackId === trackId);
        const analysis = trackAnalyses.get(trackId);
        let compatibilityScore: number | undefined;

        if (index > 0) {
          const prevTrackId = dto.trackIds![index - 1];
          const prevAnalysis = trackAnalyses.get(prevTrackId);
          if (analysis && prevAnalysis) {
            compatibilityScore = this.compatibilityService.calculateCompatibility(
              this.toTrackDjData(prevAnalysis),
              this.toTrackDjData(analysis),
            ).overall;
          }
        }

        return {
          trackId,
          order: index,
          bpm: existing?.bpm ?? analysis?.bpm ?? undefined,
          camelotKey: existing?.camelotKey ?? analysis?.camelotKey ?? undefined,
          energy: existing?.energy ?? analysis?.energy ?? undefined,
          compatibilityScore,
        };
      });
    }

    const updated = await this.djSessionRepository.update(id, {
      name: dto.name,
      transitionType: dto.transitionType as 'crossfade' | 'mashup' | 'cut' | undefined,
      transitionDuration: dto.transitionDuration,
      trackList: dto.trackIds ? trackList : undefined,
    });

    if (!updated) {
      throw new NotFoundException('Session not found');
    }

    return this.enrichSessionWithTracks(updated);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a DJ session' })
  async deleteSession(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const session = await this.djSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== req.user.id) {
      throw new ForbiddenException('Not your session');
    }

    await this.djSessionRepository.delete(id);
  }

  @Post('sessions/:id/tracks')
  @ApiOperation({ summary: 'Add a track to a DJ session' })
  @ApiResponse({ status: 200, type: DjSessionResponseDto })
  async addTrackToSession(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTrackToSessionRequestDto,
  ): Promise<DjSessionResponseDto> {
    const session = await this.djSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== req.user.id) {
      throw new ForbiddenException('Not your session');
    }

    // Get DJ analysis for new track
    const analysis = await this.djAnalysisRepository.findByTrackId(dto.trackId);

    // Calculate compatibility with last track in session
    let compatibilityScore: number | undefined;
    if (session.trackList.length > 0) {
      const lastTrack = session.trackList[session.trackList.length - 1];
      const lastAnalysis = await this.djAnalysisRepository.findByTrackId(lastTrack.trackId);
      if (analysis && lastAnalysis) {
        compatibilityScore = this.compatibilityService.calculateCompatibility(
          this.toTrackDjData(lastAnalysis),
          this.toTrackDjData(analysis),
        ).overall;
      }
    }

    const newTrack = {
      trackId: dto.trackId,
      order: session.trackList.length,
      bpm: analysis?.bpm ?? undefined,
      camelotKey: analysis?.camelotKey ?? undefined,
      energy: analysis?.energy ?? undefined,
      compatibilityScore,
    };

    const updated = await this.djSessionRepository.addTrackToSession(id, newTrack);

    if (!updated) {
      throw new NotFoundException('Session not found');
    }

    return this.enrichSessionWithTracks(updated);
  }

  @Delete('sessions/:id/tracks/:trackId')
  @ApiOperation({ summary: 'Remove a track from a DJ session' })
  @ApiResponse({ status: 200, type: DjSessionResponseDto })
  async removeTrackFromSession(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ): Promise<DjSessionResponseDto> {
    const session = await this.djSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== req.user.id) {
      throw new ForbiddenException('Not your session');
    }

    const updated = await this.djSessionRepository.removeTrackFromSession(id, trackId);

    if (!updated) {
      throw new NotFoundException('Session not found');
    }

    return this.enrichSessionWithTracks(updated);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async getTrackAnalyses(trackIds: string[]): Promise<Map<string, any>> {
    const analyses = await Promise.all(
      trackIds.map(id => this.djAnalysisRepository.findByTrackId(id))
    );

    const map = new Map<string, any>();
    trackIds.forEach((id, index) => {
      if (analyses[index]) {
        map.set(id, analyses[index]);
      }
    });

    return map;
  }

  private async enrichSessionWithTracks(session: any): Promise<DjSessionResponseDto> {
    const trackIds = session.trackList.map((t: any) => t.trackId);

    if (trackIds.length === 0) {
      return {
        id: session.id,
        name: session.name,
        trackCount: 0,
        transitionType: session.transitionType,
        transitionDuration: session.transitionDuration,
        tracks: [],
        totalDuration: 0,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    }

    // Get track details
    const trackDetails = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        artistName: tracks.artistName,
        albumId: tracks.albumId,
        duration: tracks.duration,
      })
      .from(tracks)
      .where(inArray(tracks.id, trackIds));

    const trackMap = new Map(trackDetails.map(t => [t.id, t]));

    const enrichedTracks: DjSessionTrackDto[] = session.trackList.map((t: any) => {
      const track = trackMap.get(t.trackId);
      return {
        trackId: t.trackId,
        order: t.order,
        bpm: t.bpm,
        camelotKey: t.camelotKey,
        energy: t.energy,
        compatibilityScore: t.compatibilityScore,
        title: track?.title,
        artist: track?.artistName,
        albumId: track?.albumId,
        duration: track?.duration,
      };
    });

    const totalDuration = enrichedTracks.reduce((sum, t) => sum + (t.duration || 0), 0);

    return {
      id: session.id,
      name: session.name,
      trackCount: session.trackList.length,
      transitionType: session.transitionType,
      transitionDuration: session.transitionDuration,
      tracks: enrichedTracks,
      totalDuration,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private toTrackDjData(analysis: any): { trackId: string; bpm: number | null; key: string | null; camelotKey: string | null; energy: number | null } {
    return {
      trackId: analysis.trackId,
      bpm: analysis.bpm ?? null,
      key: analysis.key ?? null,
      camelotKey: analysis.camelotKey ?? null,
      energy: analysis.energy ?? null,
    };
  }
}
