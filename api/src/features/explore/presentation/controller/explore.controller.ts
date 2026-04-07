import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { ExploreService } from '../../infrastructure/services/explore.service';
import {
  ExploreQueryDto,
  ForgottenAlbumsQueryDto,
  ExploreAlbumsResponseDto,
  ExploreTracksResponseDto,
  RandomAlbumResponseDto,
  RandomArtistResponseDto,
  RandomAlbumsResponseDto,
} from '../dtos/explore.dto';

@ApiTags('Explore')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get('unplayed')
  @ApiOperation({ summary: 'Get albums never played by the user' })
  @ApiOkResponse({ type: ExploreAlbumsResponseDto })
  async getUnplayedAlbums(
    @Request() req: { user: { userId: string } },
    @Query() query: ExploreQueryDto
  ): Promise<ExploreAlbumsResponseDto> {
    const { limit = 20, offset = 0 } = query;
    const result = await this.exploreService.getUnplayedAlbums(req.user.userId, limit, offset);

    return {
      ...result,
      limit,
      offset,
    };
  }

  @Get('forgotten')
  @ApiOperation({ summary: 'Get albums not played in recent months' })
  @ApiOkResponse({ type: ExploreAlbumsResponseDto })
  async getForgottenAlbums(
    @Request() req: { user: { userId: string } },
    @Query() query: ForgottenAlbumsQueryDto
  ): Promise<ExploreAlbumsResponseDto> {
    const { limit = 20, offset = 0, monthsAgo = 3 } = query;
    const result = await this.exploreService.getForgottenAlbums(
      req.user.userId,
      monthsAgo,
      limit,
      offset
    );

    return {
      ...result,
      limit,
      offset,
    };
  }

  @Get('hidden-gems')
  @ApiOperation({ summary: 'Get lesser-played tracks from favorite artists' })
  @ApiOkResponse({ type: ExploreTracksResponseDto })
  async getHiddenGems(
    @Request() req: { user: { userId: string } },
    @Query() query: ExploreQueryDto
  ): Promise<ExploreTracksResponseDto> {
    const { limit = 30 } = query;
    const tracks = await this.exploreService.getHiddenGems(req.user.userId, limit);

    return {
      tracks,
      total: tracks.length,
    };
  }

  @Get('random/album')
  @ApiOperation({ summary: 'Get a random album' })
  @ApiOkResponse({ type: RandomAlbumResponseDto })
  async getRandomAlbum(): Promise<RandomAlbumResponseDto> {
    const album = await this.exploreService.getRandomAlbum();
    return { album };
  }

  @Get('random/artist')
  @ApiOperation({ summary: 'Get a random artist' })
  @ApiOkResponse({ type: RandomArtistResponseDto })
  async getRandomArtist(): Promise<RandomArtistResponseDto> {
    const artist = await this.exploreService.getRandomArtist();
    return { artist };
  }

  @Get('random/albums')
  @ApiOperation({ summary: 'Get multiple random albums for surprise section' })
  @ApiOkResponse({ type: RandomAlbumsResponseDto })
  async getRandomAlbums(@Query('count') count?: number): Promise<RandomAlbumsResponseDto> {
    const albums = await this.exploreService.getRandomAlbums(count ?? 6);
    return { albums };
  }
}
