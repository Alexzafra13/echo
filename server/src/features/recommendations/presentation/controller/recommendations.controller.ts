import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  CalculateTrackScoreUseCase,
  GenerateDailyMixUseCase,
  GenerateSmartPlaylistUseCase,
} from '../../domain/use-cases';
import {
  CalculateScoreDto,
  DailyMixConfigDto,
  SmartPlaylistConfigDto,
} from '../dtos/recommendations.dto';
import {
  TrackScoreDto,
  DailyMixDto,
  SmartPlaylistDto,
} from '../dtos/recommendations-response.dto';

@ApiTags('recommendations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly calculateTrackScoreUseCase: CalculateTrackScoreUseCase,
    private readonly generateDailyMixUseCase: GenerateDailyMixUseCase,
    private readonly generateSmartPlaylistUseCase: GenerateSmartPlaylistUseCase,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /recommendations/calculate-score
   * Calculate intelligent score for a track
   */
  @Post('calculate-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate intelligent score for a track based on user behavior' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Track score calculated successfully',
    type: TrackScoreDto,
  })
  async calculateScore(@Body() dto: CalculateScoreDto, @Req() req: any): Promise<TrackScoreDto> {
    const userId = req.user.id;
    const score = await this.calculateTrackScoreUseCase.execute(userId, dto.trackId, dto.artistId);

    return {
      trackId: score.trackId,
      totalScore: score.totalScore,
      rank: score.rank,
      breakdown: {
        explicitFeedback: score.breakdown.explicitFeedback,
        implicitBehavior: score.breakdown.implicitBehavior,
        recency: score.breakdown.recency,
        diversity: score.breakdown.diversity,
      },
    };
  }

  /**
   * GET /recommendations/daily-mix
   * Generate personalized Daily Mix playlist
   */
  @Get('daily-mix')
  @ApiOperation({ summary: 'Generate personalized Daily Mix playlist (max 50 tracks)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Daily Mix generated successfully',
    type: DailyMixDto,
  })
  async getDailyMix(@Query() config: DailyMixConfigDto, @Req() req: any): Promise<DailyMixDto> {
    const userId = req.user.id;
    const dailyMix = await this.generateDailyMixUseCase.execute(userId, config);

    // Fetch track details for all tracks in the mix
    const trackIds = dailyMix.tracks.map((t) => t.trackId);
    const tracks = await this.prisma.track.findMany({
      where: { id: { in: trackIds } },
      select: {
        id: true,
        title: true,
        artistName: true,
        albumName: true,
        duration: true,
        albumId: true,
        artistId: true,
      },
    });

    // Create a map for quick lookup
    const trackMap = new Map(tracks.map((t) => [t.id, t]));

    return {
      id: dailyMix.id,
      userId: dailyMix.userId,
      name: dailyMix.name,
      description: dailyMix.description,
      tracks: dailyMix.tracks.map((t) => {
        const track = trackMap.get(t.trackId);
        return {
          trackId: t.trackId,
          totalScore: t.totalScore,
          rank: t.rank,
          breakdown: {
            explicitFeedback: t.breakdown.explicitFeedback,
            implicitBehavior: t.breakdown.implicitBehavior,
            recency: t.breakdown.recency,
            diversity: t.breakdown.diversity,
          },
          track: track
            ? {
                id: track.id,
                title: track.title,
                artistName: track.artistName || undefined,
                albumName: track.albumName || undefined,
                duration: track.duration || undefined,
                albumId: track.albumId || undefined,
                artistId: track.artistId || undefined,
              }
            : undefined,
        };
      }),
      createdAt: dailyMix.createdAt,
      expiresAt: dailyMix.expiresAt,
      metadata: {
        totalTracks: dailyMix.metadata.totalTracks,
        avgScore: dailyMix.metadata.avgScore,
        topGenres: dailyMix.metadata.topGenres,
        topArtists: dailyMix.metadata.topArtists,
        temporalDistribution: dailyMix.metadata.temporalDistribution,
      },
    };
  }

  /**
   * POST /recommendations/smart-playlist
   * Generate smart playlist based on configuration
   */
  @Post('smart-playlist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate smart playlist (by artist, genre, or personalized)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Smart playlist generated successfully',
    type: SmartPlaylistDto,
  })
  async generateSmartPlaylist(@Body() config: SmartPlaylistConfigDto, @Req() req: any): Promise<SmartPlaylistDto> {
    const userId = req.user.id;
    const result = await this.generateSmartPlaylistUseCase.execute(userId, config as any);

    // Fetch track details for all tracks in the playlist
    const trackIds = result.tracks.map((t) => t.trackId);
    const tracks = await this.prisma.track.findMany({
      where: { id: { in: trackIds } },
      select: {
        id: true,
        title: true,
        artistName: true,
        albumName: true,
        duration: true,
        albumId: true,
        artistId: true,
      },
    });

    // Create a map for quick lookup
    const trackMap = new Map(tracks.map((t) => [t.id, t]));

    return {
      tracks: result.tracks.map((t) => {
        const track = trackMap.get(t.trackId);
        return {
          trackId: t.trackId,
          totalScore: t.totalScore,
          rank: t.rank,
          breakdown: {
            explicitFeedback: t.breakdown.explicitFeedback,
            implicitBehavior: t.breakdown.implicitBehavior,
            recency: t.breakdown.recency,
            diversity: t.breakdown.diversity,
          },
          track: track
            ? {
                id: track.id,
                title: track.title,
                artistName: track.artistName || undefined,
                albumName: track.albumName || undefined,
                duration: track.duration || undefined,
                albumId: track.albumId || undefined,
                artistId: track.artistId || undefined,
              }
            : undefined,
        };
      }),
      metadata: result.metadata,
    };
  }
}
