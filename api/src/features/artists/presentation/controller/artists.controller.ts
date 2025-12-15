import { Controller, Get, Param, Query, HttpCode, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetArtistUseCase, GetArtistsUseCase, GetArtistAlbumsUseCase, SearchArtistsUseCase } from '../../domain/use-cases';
import { ArtistResponseDto, GetArtistsResponseDto, SearchArtistsResponseDto } from '../dtos';
import { AlbumResponseDto } from '@features/albums/presentation/dtos';
import { parsePaginationParams } from '@shared/utils';
import { PLAY_TRACKING_REPOSITORY, IPlayTrackingRepository } from '@features/play-tracking/domain/ports';
import { ARTIST_REPOSITORY } from '../../domain/ports/artist-repository.port';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { LastfmAgent } from '@features/external-metadata/infrastructure/agents/lastfm.agent';

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
    @Param('id') artistId: string,
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
    @Param('id') artistId: string,
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
  async getArtistStats(@Param('id') artistId: string) {
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
   * Obtener artistas relacionados usando Last.fm, filtrados por biblioteca local
   */
  @Get(':id/related')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener artistas relacionados',
    description: 'Retorna artistas similares de Last.fm que existen en tu biblioteca local'
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
    @Param('id') artistId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(Math.max(parseInt(limit || '10', 10), 1), 20);

    // 1. Get the artist from our database to get the name
    const artist = await this.artistRepository.findById(artistId);
    if (!artist) {
      return {
        data: [],
        artistId,
        limit: limitNum,
        source: 'none',
      };
    }

    // 2. Try to get similar artists from Last.fm
    const similarFromLastfm = await this.lastfmAgent.getSimilarArtists(
      artist.musicbrainzId || null,
      artist.name,
      50, // Get more from Last.fm so we can filter to local library
    );

    if (!similarFromLastfm || similarFromLastfm.length === 0) {
      this.logger.debug(`No similar artists found from Last.fm for: ${artist.name}`);
      return {
        data: [],
        artistId,
        limit: limitNum,
        source: 'lastfm',
      };
    }

    this.logger.debug(`Got ${similarFromLastfm.length} similar artists from Last.fm for: ${artist.name}`);

    // 3. Filter to only artists that exist in our local library
    // Search by name (case-insensitive)
    const relatedArtists: Array<{
      id: string;
      name: string;
      albumCount: number;
      songCount: number;
      matchScore: number;
    }> = [];

    for (const similar of similarFromLastfm) {
      if (relatedArtists.length >= limitNum) break;

      // Search for this artist in our library by name
      const localArtist = await this.artistRepository.findByName(similar.name);
      if (localArtist && localArtist.id !== artistId) {
        relatedArtists.push({
          id: localArtist.id,
          name: localArtist.name,
          albumCount: localArtist.albumCount,
          songCount: localArtist.songCount,
          matchScore: Math.round(similar.match * 100),
        });
      }
    }

    this.logger.log(`Found ${relatedArtists.length} related artists in local library for: ${artist.name}`);

    return {
      data: relatedArtists,
      artistId,
      limit: limitNum,
      source: 'lastfm',
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
  async getArtist(@Param('id') id: string): Promise<ArtistResponseDto> {
    const result = await this.getArtistUseCase.execute({ id });
    return ArtistResponseDto.fromDomain(result);
  }

  /**
   * GET /artists
   * Obtener lista paginada de artistas
   */
  @Get()
  @HttpCode(HttpStatus.OK)
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
