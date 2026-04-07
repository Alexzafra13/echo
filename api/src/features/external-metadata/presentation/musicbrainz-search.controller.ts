import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { MusicBrainzAgent } from '../infrastructure/agents/musicbrainz.agent';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums } from '@infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { ExternalMetadataService } from '../application/external-metadata.service';

interface SelectMbidDto {
  mbid: string;
  name: string;
}

// Búsqueda y asignación manual de MBIDs de MusicBrainz
@ApiTags('metadata')
@ApiBearerAuth('JWT-auth')
@Controller('metadata/musicbrainz')
@UseGuards(JwtAuthGuard)
export class MusicBrainzSearchController {
  constructor(
    @InjectPinoLogger(MusicBrainzSearchController.name)
    private readonly logger: PinoLogger,
    private readonly musicbrainzAgent: MusicBrainzAgent,
    private readonly drizzle: DrizzleService,
    private readonly metadataService: ExternalMetadataService
  ) {}

  @Get('search/artists')
  @ApiOperation({
    summary: 'Search artists on MusicBrainz',
    description: 'Search for artist matches in the MusicBrainz database',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Artist name to search' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 5)' })
  @ApiResponse({ status: 200, description: 'Artist search results' })
  async searchArtists(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query || query.trim().length === 0) {
      return { matches: [] };
    }

    const limitNum = limit ? parseInt(limit, 10) : 5;
    const matches = await this.musicbrainzAgent.searchArtist(query, limitNum);

    return { matches };
  }

  @Get('search/albums')
  @ApiOperation({
    summary: 'Search albums on MusicBrainz',
    description: 'Search for album matches in the MusicBrainz database',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Album name to search' })
  @ApiQuery({ name: 'artist', required: false, description: 'Artist name to narrow results' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 5)' })
  @ApiResponse({ status: 200, description: 'Album search results' })
  async searchAlbums(
    @Query('q') query: string,
    @Query('artist') artist?: string,
    @Query('limit') limit?: string
  ) {
    if (!query || query.trim().length === 0) {
      return { matches: [] };
    }

    const limitNum = limit ? parseInt(limit, 10) : 5;
    const matches = await this.musicbrainzAgent.searchAlbum(query, artist, limitNum);

    return { matches };
  }

  @Get('artists/:mbid')
  @ApiOperation({
    summary: 'Get artist by MusicBrainz ID',
    description: 'Retrieve artist details from MusicBrainz using their MBID',
  })
  @ApiParam({ name: 'mbid', description: 'MusicBrainz artist ID' })
  @ApiResponse({ status: 200, description: 'Artist details from MusicBrainz' })
  async getArtistByMbid(@Param('mbid') mbid: string) {
    const artist = await this.musicbrainzAgent.getArtistByMbid(mbid);
    return { artist };
  }

  @Get('albums/:mbid')
  @ApiOperation({
    summary: 'Get album by MusicBrainz ID',
    description: 'Retrieve album details from MusicBrainz using their MBID',
  })
  @ApiParam({ name: 'mbid', description: 'MusicBrainz album ID' })
  @ApiResponse({ status: 200, description: 'Album details from MusicBrainz' })
  async getAlbumByMbid(@Param('mbid') mbid: string) {
    const album = await this.musicbrainzAgent.getAlbumByMbid(mbid);
    return { album };
  }

  // Asigna MBID y dispara enriquecimiento automático
  @Post('artists/:artistId/select')
  @ApiOperation({
    summary: 'Assign MusicBrainz ID to artist',
    description:
      'Assigns a MusicBrainz MBID to an artist and triggers automatic metadata enrichment',
  })
  @ApiParam({ name: 'artistId', description: 'Artist UUID' })
  @ApiResponse({ status: 200, description: 'MBID assigned and enrichment triggered' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async selectArtistMbid(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Body() dto: SelectMbidDto
  ) {
    try {
      // Update artist MBID
      await this.drizzle.db
        .update(artists)
        .set({ mbzArtistId: dto.mbid })
        .where(eq(artists.id, artistId));

      this.logger.info(`Updated artist ${artistId} with MBID: ${dto.mbid} (${dto.name})`);

      // Trigger automatic enrichment with the new MBID
      const enrichResult = await this.metadataService.enrichArtist(
        artistId,
        true // forceRefresh to fetch new data with the MBID
      );

      return {
        success: true,
        message: `Artist MBID updated and enrichment completed`,
        mbid: dto.mbid,
        enrichment: enrichResult,
      };
    } catch (error) {
      this.logger.error(
        `Error selecting artist MBID: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Post('albums/:albumId/select')
  @ApiOperation({
    summary: 'Assign MusicBrainz ID to album',
    description:
      'Assigns a MusicBrainz MBID to an album and triggers automatic metadata enrichment',
  })
  @ApiParam({ name: 'albumId', description: 'Album UUID' })
  @ApiResponse({ status: 200, description: 'MBID assigned and enrichment triggered' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  async selectAlbumMbid(
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @Body() dto: SelectMbidDto
  ) {
    try {
      // Update album MBID
      await this.drizzle.db
        .update(albums)
        .set({ mbzAlbumId: dto.mbid })
        .where(eq(albums.id, albumId));

      this.logger.info(`Updated album ${albumId} with MBID: ${dto.mbid} (${dto.name})`);

      // Trigger automatic enrichment with the new MBID
      const enrichResult = await this.metadataService.enrichAlbum(
        albumId,
        true // forceRefresh to fetch new data with the MBID
      );

      return {
        success: true,
        message: `Album MBID updated and enrichment completed`,
        mbid: dto.mbid,
        enrichment: enrichResult,
      };
    } catch (error) {
      this.logger.error(
        `Error selecting album MBID: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Get('artists/:artistId/suggest')
  @ApiOperation({
    summary: 'Suggest MusicBrainz matches for artist',
    description:
      'Searches MusicBrainz for potential matches for an artist that does not yet have an MBID',
  })
  @ApiParam({ name: 'artistId', description: 'Artist UUID' })
  @ApiResponse({ status: 200, description: 'Suggested MusicBrainz matches' })
  async suggestArtistMatches(@Param('artistId') artistId: string) {
    try {
      const artistResult = await this.drizzle.db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      const artist = artistResult[0];

      if (!artist) {
        return { error: 'Artist not found' };
      }

      if (artist.mbzArtistId) {
        return {
          message: 'Artist already has an MBID',
          currentMbid: artist.mbzArtistId,
        };
      }

      // Search MusicBrainz for matches
      const matches = await this.musicbrainzAgent.searchArtist(artist.name, 5);

      return {
        artistId: artist.id,
        artistName: artist.name,
        matches,
      };
    } catch (error) {
      this.logger.error(
        `Error suggesting artist matches: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Get('albums/:albumId/suggest')
  @ApiOperation({
    summary: 'Suggest MusicBrainz matches for album',
    description:
      'Searches MusicBrainz for potential matches for an album that does not yet have an MBID',
  })
  @ApiParam({ name: 'albumId', description: 'Album UUID' })
  @ApiResponse({ status: 200, description: 'Suggested MusicBrainz matches' })
  async suggestAlbumMatches(@Param('albumId') albumId: string) {
    try {
      const albumResult = await this.drizzle.db
        .select({
          id: albums.id,
          name: albums.name,
          mbzAlbumId: albums.mbzAlbumId,
          artistName: artists.name,
        })
        .from(albums)
        .leftJoin(artists, eq(albums.artistId, artists.id))
        .where(eq(albums.id, albumId))
        .limit(1);
      const album = albumResult[0];

      if (!album) {
        return { error: 'Album not found' };
      }

      if (album.mbzAlbumId) {
        return {
          message: 'Album already has an MBID',
          currentMbid: album.mbzAlbumId,
        };
      }

      // Search MusicBrainz for matches
      const matches = await this.musicbrainzAgent.searchAlbum(
        album.name,
        album.artistName ?? undefined,
        5
      );

      return {
        albumId: album.id,
        albumName: album.name,
        artistName: album.artistName,
        matches,
      };
    } catch (error) {
      this.logger.error(
        `Error suggesting album matches: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }
}
