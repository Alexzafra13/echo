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
  GetAutoPlaylistsUseCase,
} from '../../domain/use-cases';
import {
  CalculateScoreDto,
  DailyMixConfigDto,
  SmartPlaylistConfigDto,
} from '../dtos/recommendations.dto';
import {
  TrackScoreDto,
  DailyMixDto,
  AutoPlaylistDto,
  SmartPlaylistDto,
} from '../dtos/recommendations-response.dto';
import { WaveMixService } from '../../domain/services/wave-mix.service';

@ApiTags('recommendations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly calculateTrackScoreUseCase: CalculateTrackScoreUseCase,
    private readonly generateDailyMixUseCase: GenerateDailyMixUseCase,
    private readonly generateSmartPlaylistUseCase: GenerateSmartPlaylistUseCase,
    private readonly getAutoPlaylistsUseCase: GetAutoPlaylistsUseCase,
    private readonly waveMixService: WaveMixService,
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
      type: dailyMix.type,
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
      coverColor: dailyMix.coverColor,
      coverImageUrl: dailyMix.coverImageUrl,
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

  /**
   * GET /recommendations/auto-playlists
   * Get all auto-generated playlists (Wave Mix + Artist playlists)
   */
  @Get('auto-playlists')
  @ApiOperation({ summary: 'Get all auto-generated playlists (Wave Mix + artist playlists)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auto playlists generated successfully',
    type: [AutoPlaylistDto],
  })
  async getAutoPlaylists(@Req() req: any): Promise<AutoPlaylistDto[]> {
    const userId = req.user.id;
    const playlists = await this.getAutoPlaylistsUseCase.execute(userId);

    // Fetch track details for all playlists
    const playlistsWithTracks = await Promise.all(
      playlists.map(async (playlist) => {
        const trackIds = playlist.tracks.map((t) => t.trackId);
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

        const trackMap = new Map(tracks.map((t) => [t.id, t]));

        return {
          id: playlist.id,
          type: playlist.type,
          userId: playlist.userId,
          name: playlist.name,
          description: playlist.description,
          tracks: playlist.tracks.map((t) => {
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
          createdAt: playlist.createdAt,
          expiresAt: playlist.expiresAt,
          metadata: playlist.metadata,
          coverColor: playlist.coverColor,
          coverImageUrl: playlist.coverImageUrl,
        };
      }),
    );

    return playlistsWithTracks;
  }

  /**
   * POST /recommendations/auto-playlists/refresh
   * Force refresh auto-generated playlists (ignores Redis cache)
   */
  @Post('auto-playlists/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force refresh auto-generated playlists (ignores 24h cache)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auto playlists refreshed successfully',
    type: [AutoPlaylistDto],
  })
  async refreshAutoPlaylists(@Req() req: any): Promise<AutoPlaylistDto[]> {
    const userId = req.user.id;
    const playlists = await this.waveMixService.refreshAutoPlaylists(userId);

    // Fetch track details for all playlists (reuse same mapping logic)
    const playlistsWithTracks = await Promise.all(
      playlists.map(async (playlist) => {
        const trackIds = playlist.tracks.map((t) => t.trackId);
        const tracks = await this.prisma.track.findMany({
          where: { id: { in: trackIds } },
          select: { id: true, title: true, artistName: true, albumName: true, duration: true, albumId: true, artistId: true },
        });

        const trackMap = new Map(tracks.map((t) => [t.id, t]));

        return {
          id: playlist.id, type: playlist.type, userId: playlist.userId,
          name: playlist.name, description: playlist.description,
          tracks: playlist.tracks.map((t) => ({
            trackId: t.trackId, totalScore: t.totalScore, rank: t.rank,
            breakdown: { explicitFeedback: t.breakdown.explicitFeedback, implicitBehavior: t.breakdown.implicitBehavior,
              recency: t.breakdown.recency, diversity: t.breakdown.diversity },
            track: trackMap.get(t.trackId) ? {
              id: trackMap.get(t.trackId)!.id, title: trackMap.get(t.trackId)!.title,
              artistName: trackMap.get(t.trackId)!.artistName || undefined,
              albumName: trackMap.get(t.trackId)!.albumName || undefined,
              duration: trackMap.get(t.trackId)!.duration || undefined,
              albumId: trackMap.get(t.trackId)!.albumId || undefined,
              artistId: trackMap.get(t.trackId)!.artistId || undefined
            } : undefined
          })),
          createdAt: playlist.createdAt, expiresAt: playlist.expiresAt,
          metadata: playlist.metadata, coverColor: playlist.coverColor, coverImageUrl: playlist.coverImageUrl,
        };
      })
    );

    return playlistsWithTracks;
  }

  /**
   * GET /recommendations/artist-playlists
   * Get paginated artist playlists for dedicated artists page
   */
  @Get('artist-playlists')
  @ApiOperation({ summary: 'Get paginated artist playlists (for artists page)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Artist playlists retrieved successfully' })
  async getArtistPlaylists(
    @Req() req: any, @Query('skip') skip: string = '0', @Query('take') take: string = '10'
  ): Promise<{ playlists: AutoPlaylistDto[]; total: number; skip: number; take: number; hasMore: boolean }> {
    const userId = req.user.id;
    const skipNum = Math.max(0, parseInt(skip, 10) || 0);
    const takeNum = Math.min(50, Math.max(1, parseInt(take, 10) || 10));

    const result = await this.waveMixService.getArtistPlaylistsPaginated(userId, skipNum, takeNum);

    // Fetch track details for all playlists
    const playlistsWithTracks = await Promise.all(
      result.playlists.map(async (playlist) => {
        const trackIds = playlist.tracks.map((t) => t.trackId);
        const tracks = await this.prisma.track.findMany({
          where: { id: { in: trackIds } },
          select: { id: true, title: true, artistName: true, albumName: true, duration: true, albumId: true, artistId: true },
        });

        const trackMap = new Map(tracks.map((t) => [t.id, t]));

        return {
          id: playlist.id, type: playlist.type, userId: playlist.userId,
          name: playlist.name, description: playlist.description,
          tracks: playlist.tracks.map((t) => ({
            trackId: t.trackId, totalScore: t.totalScore, rank: t.rank,
            breakdown: { explicitFeedback: t.breakdown.explicitFeedback, implicitBehavior: t.breakdown.implicitBehavior,
              recency: t.breakdown.recency, diversity: t.breakdown.diversity },
            track: trackMap.get(t.trackId) ? {
              id: trackMap.get(t.trackId)!.id, title: trackMap.get(t.trackId)!.title,
              artistName: trackMap.get(t.trackId)!.artistName || undefined,
              albumName: trackMap.get(t.trackId)!.albumName || undefined,
              duration: trackMap.get(t.trackId)!.duration || undefined,
              albumId: trackMap.get(t.trackId)!.albumId || undefined,
              artistId: trackMap.get(t.trackId)!.artistId || undefined
            } : undefined
          })),
          createdAt: playlist.createdAt, expiresAt: playlist.expiresAt,
          metadata: playlist.metadata, coverColor: playlist.coverColor, coverImageUrl: playlist.coverImageUrl,
        };
      })
    );

    return { playlists: playlistsWithTracks, total: result.total, skip: skipNum, take: takeNum, hasMore: result.hasMore };
  }
}
