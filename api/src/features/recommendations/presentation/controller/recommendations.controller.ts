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
  Inject,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RequestWithUser } from '@shared/types/request.types';
import { parsePaginationParams } from '@shared/utils';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import {
  CalculateTrackScoreUseCase,
  GenerateDailyMixUseCase,
  GenerateSmartPlaylistUseCase,
  GetAutoPlaylistsUseCase,
} from '../../domain/use-cases';
import { SmartPlaylistConfig } from '../../domain/entities/track-score.entity';
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
import { WaveMixService } from '../../infrastructure/services/wave-mix.service';

@ApiTags('recommendations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    @InjectPinoLogger(RecommendationsController.name)
    private readonly logger: PinoLogger,
    private readonly calculateTrackScoreUseCase: CalculateTrackScoreUseCase,
    private readonly generateDailyMixUseCase: GenerateDailyMixUseCase,
    private readonly generateSmartPlaylistUseCase: GenerateSmartPlaylistUseCase,
    private readonly getAutoPlaylistsUseCase: GetAutoPlaylistsUseCase,
    private readonly waveMixService: WaveMixService,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  @Post('calculate-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate intelligent score for a track based on user behavior' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Track score calculated successfully',
    type: TrackScoreDto,
  })
  async calculateScore(@Body() dto: CalculateScoreDto, @Req() req: RequestWithUser): Promise<TrackScoreDto> {
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

  @Get('daily-mix')
  @ApiOperation({ summary: 'Generate personalized Daily Mix playlist (max 50 tracks)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Daily Mix generated successfully',
    type: DailyMixDto,
  })
  async getDailyMix(@Query() config: DailyMixConfigDto, @Req() req: RequestWithUser): Promise<DailyMixDto> {
    const userId = req.user.id;
    const dailyMix = await this.generateDailyMixUseCase.execute(userId, config);

    // Use helper method to fetch and map tracks
    const trackIds = dailyMix.tracks.map((t) => t.trackId);
    const trackMap = await this.fetchTracksById(trackIds);

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
                // Audio normalization data (LUFS/ReplayGain)
                rgTrackGain: track.rgTrackGain,
                rgTrackPeak: track.rgTrackPeak,
                rgAlbumGain: track.rgAlbumGain,
                rgAlbumPeak: track.rgAlbumPeak,
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

  @Post('smart-playlist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate smart playlist (by artist, genre, or personalized)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Smart playlist generated successfully',
    type: SmartPlaylistDto,
  })
  async generateSmartPlaylist(@Body() config: SmartPlaylistConfigDto, @Req() req: RequestWithUser): Promise<SmartPlaylistDto> {
    const userId = req.user.id;

    // Log for autoplay debugging
    this.logger.info(`[SmartPlaylist] Generating playlist: artistId=${config.artistId}, name=${config.name}`);

    const result = await this.generateSmartPlaylistUseCase.execute(userId, config as SmartPlaylistConfig);

    this.logger.info(`[SmartPlaylist] Generated ${result.tracks.length} tracks for artistId=${config.artistId}`);

    // Use helper method to fetch and map tracks
    const trackIds = result.tracks.map((t) => t.trackId);
    const trackMap = await this.fetchTracksById(trackIds);

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
                // Audio normalization data (LUFS/ReplayGain)
                rgTrackGain: track.rgTrackGain,
                rgTrackPeak: track.rgTrackPeak,
                rgAlbumGain: track.rgAlbumGain,
                rgAlbumPeak: track.rgAlbumPeak,
              }
            : undefined,
        };
      }),
      metadata: {
        totalTracks: result.metadata.totalTracks,
        avgScore: result.metadata.avgScore,
        config: result.metadata.config as SmartPlaylistConfigDto | undefined,
      },
    };
  }

  @Get('wave-mix')
  @ApiOperation({ summary: 'Get all Wave Mix playlists (daily mix + artist + genre)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wave Mix playlists generated successfully',
    type: [AutoPlaylistDto],
  })
  async getWaveMixPlaylists(@Req() req: RequestWithUser): Promise<AutoPlaylistDto[]> {
    const userId = req.user.id;
    const playlists = await this.getAutoPlaylistsUseCase.execute(userId);

    // OPTIMIZATION: Use batch enrichment to avoid N+1 query
    return this.enrichPlaylistsWithTracks(playlists);
  }

  @Post('wave-mix/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force refresh Wave Mix playlists (ignores 24h cache)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wave Mix playlists refreshed successfully',
    type: [AutoPlaylistDto],
  })
  async refreshWaveMix(@Req() req: RequestWithUser): Promise<AutoPlaylistDto[]> {
    const userId = req.user.id;
    const playlists = await this.waveMixService.refreshAutoPlaylists(userId);

    // OPTIMIZATION: Use batch enrichment to avoid N+1 query
    return this.enrichPlaylistsWithTracks(playlists);
  }

  @Get('wave-mix/artists')
  @ApiOperation({ summary: 'Get paginated Wave Mix artist playlists' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Wave Mix artist playlists retrieved successfully' })
  async getWaveMixArtistPlaylists(
    @Req() req: RequestWithUser, @Query('skip') skip?: string, @Query('take') take?: string
  ): Promise<{ playlists: AutoPlaylistDto[]; total: number; skip: number; take: number; hasMore: boolean }> {
    const userId = req.user.id;
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take, { maxTake: 50 });

    const result = await this.waveMixService.getArtistPlaylistsPaginated(userId, skipNum, takeNum);

    // OPTIMIZATION: Use batch enrichment to avoid N+1 query
    const playlistsWithTracks = await this.enrichPlaylistsWithTracks(result.playlists);

    return { playlists: playlistsWithTracks, total: result.total, skip: skipNum, take: takeNum, hasMore: result.hasMore };
  }

  @Get('wave-mix/genres')
  @ApiOperation({ summary: 'Get paginated Wave Mix genre playlists' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Wave Mix genre playlists retrieved successfully' })
  async getWaveMixGenrePlaylists(
    @Req() req: RequestWithUser, @Query('skip') skip?: string, @Query('take') take?: string
  ): Promise<{ playlists: AutoPlaylistDto[]; total: number; skip: number; take: number; hasMore: boolean }> {
    const userId = req.user.id;
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take, { maxTake: 50 });

    const result = await this.waveMixService.getGenrePlaylistsPaginated(userId, skipNum, takeNum);

    // OPTIMIZATION: Use batch enrichment to avoid N+1 query
    const playlistsWithTracks = await this.enrichPlaylistsWithTracks(result.playlists);

    return { playlists: playlistsWithTracks, total: result.total, skip: skipNum, take: takeNum, hasMore: result.hasMore };
  }

  private async fetchTracksById(trackIds: string[]) {
    if (trackIds.length === 0) {
      return new Map();
    }

    const tracks = await this.trackRepository.findByIds(trackIds);

    // Convertir a formato esperado por el DTO (primitives)
    const tracksData = tracks.map((t) => {
      const primitives = t.toPrimitives();
      return {
        id: primitives.id,
        title: primitives.title,
        artistName: primitives.artistName,
        albumName: primitives.albumName,
        duration: primitives.duration,
        albumId: primitives.albumId,
        artistId: primitives.artistId,
        // Audio normalization data (LUFS/ReplayGain)
        rgTrackGain: primitives.rgTrackGain,
        rgTrackPeak: primitives.rgTrackPeak,
        rgAlbumGain: primitives.rgAlbumGain,
        rgAlbumPeak: primitives.rgAlbumPeak,
      };
    });

    return new Map(tracksData.map((t) => [t.id, t]));
  }

  private mapPlaylistWithTracks(playlist: any, trackMap: Map<string, any>): AutoPlaylistDto {
    return {
      id: playlist.id,
      type: playlist.type,
      userId: playlist.userId,
      name: playlist.name,
      description: playlist.description,
      tracks: playlist.tracks.map((t: any) => {
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
                // Audio normalization data (LUFS/ReplayGain)
                rgTrackGain: track.rgTrackGain,
                rgTrackPeak: track.rgTrackPeak,
                rgAlbumGain: track.rgAlbumGain,
                rgAlbumPeak: track.rgAlbumPeak,
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
  }

  // Batch enrich para evitar N+1 queries
  private async enrichPlaylistsWithTracks(playlists: any[]): Promise<AutoPlaylistDto[]> {
    if (playlists.length === 0) {
      return [];
    }

    // Collect all unique track IDs from all playlists
    const allTrackIds = new Set<string>();
    for (const playlist of playlists) {
      for (const track of playlist.tracks) {
        allTrackIds.add(track.trackId);
      }
    }

    // Batch fetch all tracks at once
    const trackMap = await this.fetchTracksById(Array.from(allTrackIds));

    // Map each playlist with the shared track map
    return playlists.map((playlist) => this.mapPlaylistWithTracks(playlist, trackMap));
  }
}
