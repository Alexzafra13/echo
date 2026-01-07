import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RequestWithUser } from '@shared/types/request.types';
import {
  RecordPlayUseCase,
  RecordSkipUseCase,
  GetUserPlayHistoryUseCase,
  GetUserTopTracksUseCase,
  GetRecentlyPlayedUseCase,
  GetUserPlaySummaryUseCase,
  UpdatePlaybackStateUseCase,
} from '../../domain/use-cases';
import { RecordPlayDto, RecordSkipDto, UpdatePlaybackStateDto } from '../dtos/play-tracking.dto';
import {
  PlayEventResponseDto,
  TopTrackResponseDto,
  UserPlaySummaryResponseDto,
} from '../dtos/play-tracking-response.dto';

@ApiTags('play-tracking')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('play-tracking')
export class PlayTrackingController {
  constructor(
    private readonly recordPlayUseCase: RecordPlayUseCase,
    private readonly recordSkipUseCase: RecordSkipUseCase,
    private readonly getUserPlayHistoryUseCase: GetUserPlayHistoryUseCase,
    private readonly getUserTopTracksUseCase: GetUserTopTracksUseCase,
    private readonly getRecentlyPlayedUseCase: GetRecentlyPlayedUseCase,
    private readonly getUserPlaySummaryUseCase: GetUserPlaySummaryUseCase,
    private readonly updatePlaybackStateUseCase: UpdatePlaybackStateUseCase,
  ) {}

  @Post('play')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a play event with smart context tracking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Play event recorded successfully',
    type: PlayEventResponseDto,
  })
  async recordPlay(@Body() dto: RecordPlayDto, @Req() req: RequestWithUser): Promise<PlayEventResponseDto> {
    const userId = req.user.id;

    const playEvent = await this.recordPlayUseCase.execute({
      userId,
      trackId: dto.trackId,
      playContext: dto.playContext as any,
      completionRate: dto.completionRate,
      sourceId: dto.sourceId,
      sourceType: dto.sourceType as any,
      client: req.headers['user-agent'],
    });

    return {
      id: playEvent.id,
      userId: playEvent.userId,
      trackId: playEvent.trackId,
      playedAt: playEvent.playedAt,
      client: playEvent.client,
      playContext: playEvent.playContext,
      completionRate: playEvent.completionRate,
      skipped: playEvent.skipped,
      sourceId: playEvent.sourceId,
      sourceType: playEvent.sourceType,
      createdAt: playEvent.createdAt,
    };
  }

  @Post('skip')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a skip event (track skipped before completion)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Skip event recorded successfully',
    type: PlayEventResponseDto,
  })
  async recordSkip(@Body() dto: RecordSkipDto, @Req() req: RequestWithUser): Promise<PlayEventResponseDto> {
    const userId = req.user.id;

    const playEvent = await this.recordSkipUseCase.execute(
      userId,
      dto.trackId,
      dto.completionRate,
      dto.playContext as any,
    );

    return {
      id: playEvent.id,
      userId: playEvent.userId,
      trackId: playEvent.trackId,
      playedAt: playEvent.playedAt,
      client: playEvent.client,
      playContext: playEvent.playContext,
      completionRate: playEvent.completionRate,
      skipped: playEvent.skipped,
      sourceId: playEvent.sourceId,
      sourceType: playEvent.sourceType,
      createdAt: playEvent.createdAt,
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user play history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Play history retrieved successfully',
    type: [PlayEventResponseDto],
  })
  async getPlayHistory(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
    @Req() req: RequestWithUser,
  ): Promise<PlayEventResponseDto[]> {
    const userId = req.user.id;
    const history = await this.getUserPlayHistoryUseCase.execute(userId, limit, offset);

    return history.map((event) => ({
      id: event.id,
      userId: event.userId,
      trackId: event.trackId,
      playedAt: event.playedAt,
      client: event.client,
      playContext: event.playContext,
      completionRate: event.completionRate,
      skipped: event.skipped,
      sourceId: event.sourceId,
      sourceType: event.sourceType,
      createdAt: event.createdAt,
    }));
  }

  @Get('top-tracks')
  @ApiOperation({ summary: 'Get user top tracks based on weighted play count' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Top tracks retrieved successfully',
    type: [TopTrackResponseDto],
  })
  async getTopTracks(
    @Req() req: RequestWithUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ): Promise<TopTrackResponseDto[]> {
    const userId = req.user.id;
    return await this.getUserTopTracksUseCase.execute(userId, limit, days);
  }

  @Get('recently-played')
  @ApiOperation({ summary: 'Get recently played tracks (unique tracks)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recently played tracks retrieved successfully',
    type: [String],
  })
  async getRecentlyPlayed(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Req() req: RequestWithUser,
  ): Promise<string[]> {
    const userId = req.user.id;
    return await this.getRecentlyPlayedUseCase.execute(userId, limit);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get user play summary with statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Play summary retrieved successfully',
    type: UserPlaySummaryResponseDto,
  })
  async getPlaySummary(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
    @Req() req: RequestWithUser,
  ): Promise<UserPlaySummaryResponseDto> {
    const userId = req.user.id;
    const summary = await this.getUserPlaySummaryUseCase.execute(userId, days);

    return {
      totalPlays: summary.totalPlays,
      totalSkips: summary.totalSkips,
      avgCompletionRate: summary.avgCompletionRate,
      topContext: summary.topContext,
      playsByContext: summary.playsByContext,
      recentPlays: summary.recentPlays.map((event) => ({
        id: event.id,
        userId: event.userId,
        trackId: event.trackId,
        playedAt: event.playedAt,
        client: event.client,
        playContext: event.playContext,
        completionRate: event.completionRate,
        skipped: event.skipped,
        sourceId: event.sourceId,
        sourceType: event.sourceType,
        createdAt: event.createdAt,
      })),
    };
  }

  @Put('playback-state')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Update playback state',
    description: 'Update current playback state for the social "listening now" feature. Call this when playback starts, pauses, or stops.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Playback state updated successfully',
  })
  async updatePlaybackState(
    @Body() dto: UpdatePlaybackStateDto,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const userId = req.user.id;

    await this.updatePlaybackStateUseCase.execute({
      userId,
      isPlaying: dto.isPlaying,
      currentTrackId: dto.currentTrackId,
    });
  }
}
