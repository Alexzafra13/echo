import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { tracks, djAnalysis, djStems } from '../../../../infrastructure/database/schema';
import { eq, inArray } from 'drizzle-orm';

import { DjAnalysisQueueService } from '../../infrastructure/services/dj-analysis-queue.service';
import { StemQueueService } from '../../infrastructure/services/stem-queue.service';
import { TransitionEngineService } from '../../infrastructure/services/transition-engine.service';
import { DrizzleDjAnalysisRepository } from '../../infrastructure/persistence/dj-analysis.repository';

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

    await this.analysisQueue.startAnalysisQueue(tracksToAnalyze);

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
}
