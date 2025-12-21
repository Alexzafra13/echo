import { Controller, Get, Param, Query, HttpCode, HttpStatus, Inject, Logger, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetArtistUseCase, GetArtistsUseCase, GetArtistAlbumsUseCase, SearchArtistsUseCase } from '../../domain/use-cases';
import { ArtistResponseDto, GetArtistsResponseDto, SearchArtistsResponseDto } from '../dtos';
import { AlbumResponseDto } from '@features/albums/presentation/dtos';
import { parsePaginationParams } from '@shared/utils';
import { PLAY_TRACKING_REPOSITORY, IPlayTrackingRepository } from '@features/play-tracking/domain/ports';
import { ARTIST_REPOSITORY } from '../../domain/ports/artist-repository.port';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { LastfmAgent } from '@features/external-metadata/infrastructure/agents/lastfm.agent';
import { CacheControl } from '@shared/interceptors';

/**
 * ArtistsController - Controlador de artistas
 *
 * Responsabilidades:
 * - Recibir peticiones HTTP
 * - Validar parámetros
 * - Llamar a los use cases
 * - Mapear respuestas a DTOs
 * - Retornar JSON
 */
@ApiTags('artists')
@ApiBearerAuth('JWT-auth')
@Controller('artists')
export class ArtistsController {
  private readonly logger = new Logger(ArtistsController.name);

  constructor(
    private readonly getArtistUseCase: GetArtistUseCase,
    private readonly getArtistsUseCase: GetArtistsUseCase,
    private readonly getArtistAlbumsUseCase: GetArtistAlbumsUseCase,
    private readonly searchArtistsUseCase: SearchArtistsUseCase,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepository: IPlayTrackingRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: IArtistRepository,
    private readonly lastfmAgent: LastfmAgent,
  ) {}

  /**
   * GET /artists/:id/albums
   * Obtener álbumes de un artista
   * IMPORTANTE: Debe ir ANTES de @Get(':id') para que el router lo capture correctamente
   */
  @Get(':id/albums')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener álbumes del artista',
    description: 'Retorna todos los álbumes de un artista específico, ordenados por fecha de creación'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del artista',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de álbumes a omitir (para paginación)',
    example: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de álbumes a retornar (1-100)',
    example: 100
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes del artista obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/AlbumResponseDto' } },
        total: { type: 'number' },
        skip: { type: 'number' },
        take: { type: 'number' },
        hasMore: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Artista no encontrado'
  })
  async getArtistAlbums(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take, { defaultTake: 100 });

    const result = await this.getArtistAlbumsUseCase.execute({
      artistId,
      skip: skipNum,
      take: takeNum,
    });

    return {
      data: result.data.map((album) => AlbumResponseDto.fromDomain(album)),
      total: result.total,
      skip: result.skip,
      take: result.take,
      hasMore: result.hasMore,
    };
  }

  /**
   * GET /artists/:id/top-tracks
   * Obtener las canciones más escuchadas de un artista (globalmente entre todos los usuarios)
   */
  @Get(':id/top-tracks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener top tracks del artista',
    description: 'Retorna las canciones más escuchadas de un artista en toda la plataforma'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del artista',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Número de tracks a retornar (1-50)',
    example: 10
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Filtrar por días recientes (opcional)',
    example: 30
  })
  @ApiResponse({
    status: 200,
    description: 'Top tracks del artista obtenidos exitosamente'
  })
  async getArtistTopTracks(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('limit') limit?: string,
    @Query('days') days?: string,
  ) {
    const limitNum = Math.min(Math.max(parseInt(limit || '10', 10), 1), 50);
    const daysNum = days ? parseInt(days, 10) : undefined;

    const topTracks = await this.playTrackingRepository.getArtistTopTracks(
      artistId,
      limitNum,
      daysNum,
    );

    return {
      data: topTracks,
      artistId,
      limit: limitNum,
      days: daysNum,
    };
  }

  /**
   * GET /artists/:id/stats
   * Obtener estadísticas globales del artista
   */
  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estadísticas del artista',
    description: 'Retorna estadísticas globales de escuchas del artista en toda la plataforma'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del artista',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del artista obtenidas exitosamente'
  })
  async getArtistStats(@Param('id', ParseUUIDPipe) artistId: string) {
    const stats = await this.playTrackingRepository.getArtistGlobalStats(artistId);

    return {
      artistId,
      totalPlays: stats.totalPlays,
      uniqueListeners: stats.uniqueListeners,
      avgCompletionRate: Math.round(stats.avgCompletionRate * 100) / 100,
      skipRate: Math.round(stats.skipRate * 100) / 100,
    };
  }

  /**
   * GET /artists/:id/related
   * Obtener artistas relacionados - primero con datos internos, fallback a Last.fm
   */
  @Get(':id/related')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener artistas relacionados',
    description: 'Retorna artistas similares basado en patrones de escucha internos, con fallback a Last.fm'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del artista',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Número de artistas relacionados a retornar (1-20)',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Artistas relacionados obtenidos exitosamente'
  })
  async getRelatedArtists(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(Math.max(parseInt(limit || '10', 10), 1), 20);

    // 1. Get the artist from our database
    const artist = await this.artistRepository.findById(artistId);
    if (!artist) {
      return {
        data: [],
        artistId,
        limit: limitNum,
        source: 'none',
      };
    }

    // 2. Check if Last.fm is enabled
    const lastfmEnabled = this.lastfmAgent.isEnabled();

    // 3. If Last.fm is enabled, use it to find similar artists filtered by library
    if (lastfmEnabled) {
      const similarFromLastfm = await this.lastfmAgent.getSimilarArtists(
        artist.mbzArtistId || null,
        artist.name,
        50, // Get more from Last.fm so we can filter to local library
      );

      this.logger.info(
        `[Autoplay] Last.fm returned ${similarFromLastfm?.length || 0} similar artists for: ${artist.name}`
      );

      if (similarFromLastfm && similarFromLastfm.length > 0) {
        const lastfmArtists: Array<{
          id: string;
          name: string;
          albumCount: number;
          songCount: number;
          matchScore: number;
        }> = [];

        const notFoundInLibrary: string[] = [];

        for (const similar of similarFromLastfm) {
          if (lastfmArtists.length >= limitNum) break;

          // Search for this artist in our library by name
          const localArtist = await this.artistRepository.findByName(similar.name);
          if (localArtist && localArtist.id !== artistId) {
            lastfmArtists.push({
              id: localArtist.id,
              name: localArtist.name,
              albumCount: localArtist.albumCount,
              songCount: localArtist.songCount,
              matchScore: Math.round(similar.match * 100),
            });
          } else if (!localArtist) {
            notFoundInLibrary.push(similar.name);
          }
        }

        if (notFoundInLibrary.length > 0) {
          this.logger.info(
            `[Autoplay] Similar artists NOT in library: ${notFoundInLibrary.slice(0, 10).join(', ')}${notFoundInLibrary.length > 10 ? '...' : ''}`
          );
        }

        if (lastfmArtists.length > 0) {
          this.logger.info(
            `[Autoplay] Found ${lastfmArtists.length} related artists IN library: ${lastfmArtists.map(a => a.name).join(', ')}`
          );
          return {
            data: lastfmArtists,
            artistId,
            limit: limitNum,
            source: 'lastfm',
          };
        }
      }

      this.logger.info(`[Autoplay] No Last.fm similar artists found in library for: ${artist.name}, trying internal patterns`);
    }

    // 4. Fallback: Use internal co-listening patterns
    // (when Last.fm is disabled OR Last.fm returned no results in our library)
    const internalRelated = await this.playTrackingRepository.getRelatedArtists(
      artistId,
      limitNum,
    );

    const internalArtists: Array<{
      id: string;
      name: string;
      albumCount: number;
      songCount: number;
      matchScore: number;
    }> = [];

    for (const stat of internalRelated) {
      const relArtist = await this.artistRepository.findById(stat.artistId);
      if (relArtist) {
        internalArtists.push({
          id: relArtist.id,
          name: relArtist.name,
          albumCount: relArtist.albumCount,
          songCount: relArtist.songCount,
          matchScore: Math.round(stat.score),
        });
      }
    }

    this.logger.debug(
      `Found ${internalArtists.length} related artists from internal patterns for: ${artist.name}`
    );

    return {
      data: internalArtists,
      artistId,
      limit: limitNum,
      source: internalArtists.length > 0 ? 'internal' : 'none',
    };
  }

  /**
   * GET /artists/:id
   * Obtener UN artista por su ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener artista por ID',
    description: 'Retorna la información completa de un artista específico por su identificador UUID'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del artista',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Artista encontrado exitosamente',
    type: ArtistResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Artista no encontrado'
  })
  async getArtist(@Param('id', ParseUUIDPipe) id: string): Promise<ArtistResponseDto> {
    const result = await this.getArtistUseCase.execute({ id });
    return ArtistResponseDto.fromDomain(result);
  }

  /**
   * GET /artists
   * Obtener lista paginada de artistas
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @CacheControl(60) // 1 minute cache
  @ApiOperation({
    summary: 'Listar artistas',
    description: 'Retorna una lista paginada de todos los artistas disponibles en el servidor'
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de artistas a omitir (para paginación)',
    example: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de artistas a retornar (1-100)',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de artistas obtenida exitosamente',
    type: GetArtistsResponseDto
  })
  async getArtists(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<GetArtistsResponseDto> {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take);

    const result = await this.getArtistsUseCase.execute({
      skip: skipNum,
      take: takeNum,
    });

    return GetArtistsResponseDto.fromDomain(result);
  }

  /**
   * GET /artists/search/:query
   * Buscar artistas por nombre
   */
  @Get('search/:query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar artistas',
    description: 'Busca artistas por nombre (mínimo 2 caracteres). La búsqueda es case-insensitive y busca coincidencias parciales'
  })
  @ApiParam({
    name: 'query',
    type: String,
    description: 'Término de búsqueda (mínimo 2 caracteres)',
    example: 'Beatles'
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de resultados a omitir (para paginación)',
    example: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de resultados a retornar (1-100)',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda completada exitosamente',
    type: SearchArtistsResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Query inválido (vacío o menor a 2 caracteres)'
  })
  async searchArtists(
    @Param('query') query: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<SearchArtistsResponseDto> {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take);

    const result = await this.searchArtistsUseCase.execute({
      query,
      skip: skipNum,
      take: takeNum,
    });

    return SearchArtistsResponseDto.fromDomain(result);
  }
}
