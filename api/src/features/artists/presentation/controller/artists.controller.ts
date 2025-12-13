import { Controller, Get, Param, Query, HttpCode, HttpStatus, Inject, Logger, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetArtistUseCase, GetArtistsUseCase, GetArtistAlbumsUseCase, SearchArtistsUseCase } from '../../domain/use-cases';
import { ArtistResponseDto, GetArtistsResponseDto, SearchArtistsResponseDto } from '../dtos';
import { AlbumResponseDto } from '@features/albums/presentation/dtos';
import { TrackResponseDto } from '@features/tracks/presentation/dtos';
import { ITrackRepository, TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { IArtistRepository, ARTIST_REPOSITORY } from '../../domain/ports/artist-repository.port';
import { Artist } from '../../domain/entities/artist.entity';
import { LastfmAgent } from '@features/external-metadata/infrastructure/agents/lastfm.agent';
import { ExternalMetadataService } from '@features/external-metadata/application/external-metadata.service';
import { SimilarArtist } from '@features/external-metadata/domain/entities';
import { parsePaginationParams } from '@shared/utils';

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
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: IArtistRepository,
    private readonly lastfmAgent: LastfmAgent,
    private readonly externalMetadataService: ExternalMetadataService,
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
   * GET /artists/:id/stats
   * Obtener estadísticas de reproducciones del artista
   */
  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estadísticas del artista',
    description: 'Retorna el total de reproducciones del artista sumando todos los usuarios'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del artista',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        playCount: { type: 'number', description: 'Total de reproducciones' },
      },
    },
  })
  async getArtistStats(@Param('id', ParseUUIDPipe) id: string) {
    // O(1) read directly from the artists.playCount field
    const artist = await this.getArtistUseCase.execute({ id });
    return { playCount: artist.playCount };
  }

  /**
   * GET /artists/:id/top-tracks
   * Obtener las canciones más reproducidas del artista
   */
  @Get(':id/top-tracks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener top tracks del artista',
    description: 'Retorna las canciones más reproducidas del artista, ordenadas por número de reproducciones'
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
    description: 'Número de tracks a retornar (1-20, default: 5)',
    example: 5
  })
  @ApiResponse({
    status: 200,
    description: 'Top tracks obtenidos exitosamente',
    type: [TrackResponseDto]
  })
  async getArtistTopTracks(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || '5', 10) || 5, 1), 20);
    const tracks = await this.trackRepository.findTopByArtistId(artistId, parsedLimit);
    return tracks.map((track) => TrackResponseDto.fromDomain(track));
  }

  /**
   * GET /artists/:id/similar
   * Obtener artistas similares desde Last.fm
   * Crea perfiles para artistas externos y descarga sus imágenes
   */
  @Get(':id/similar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener artistas similares',
    description: 'Retorna artistas musicalmente similares usando datos de Last.fm. Crea perfiles locales para artistas externos.'
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
    description: 'Número de artistas similares a retornar (1-30, default: 15)',
    example: 15
  })
  @ApiResponse({
    status: 200,
    description: 'Artistas similares obtenidos exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del artista' },
          localId: { type: 'string', description: 'ID local del artista' },
          match: { type: 'number', nullable: true, description: 'Score de similitud (0-1)' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Artista no encontrado' })
  async getSimilarArtists(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || '15', 10) || 15, 1), 30);

    // Get artist from database to get MBID and name
    const artist = await this.getArtistUseCase.execute({ id: artistId });

    // Check if Last.fm is enabled
    if (!this.lastfmAgent.isEnabled()) {
      this.logger.warn('Last.fm agent is not enabled, cannot fetch similar artists');
      return [];
    }

    // Request more artists from Last.fm (2x limit to have options)
    const similarArtists = await this.lastfmAgent.getSimilarArtists(
      artist.mbzArtistId || null,
      artist.name,
      parsedLimit * 2
    );

    if (!similarArtists || similarArtists.length === 0) {
      return [];
    }

    // Find existing local artists by name
    const similarNames = similarArtists.map((a) => a.name);
    const localArtistsMap = await this.artistRepository.findByNames(similarNames);

    // Process similar artists - create external ones if needed
    const results: Array<{ name: string; localId: string; match: number | null }> = [];
    const artistsToEnrich: string[] = [];

    for (const similar of similarArtists) {
      let localArtist = localArtistsMap.get(similar.name.toLowerCase());

      // If artist doesn't exist locally and has MBID, create them
      if (!localArtist && similar.mbid) {
        const created = await this.createExternalArtist(similar);
        if (created) {
          localArtist = created;
          artistsToEnrich.push(created.id);
        }
      }

      if (localArtist) {
        results.push({
          name: similar.name,
          localId: localArtist.id,
          match: similar.match,
        });
      }
    }

    // Sort: by match score (all have localId now)
    results.sort((a, b) => (b.match || 0) - (a.match || 0));

    // Trigger enrichment for new artists (async - don't block response)
    if (artistsToEnrich.length > 0) {
      this.enrichExternalArtists(artistsToEnrich);
    }

    return results.slice(0, parsedLimit);
  }

  /**
   * Create an external artist (similar artist without tracks)
   */
  private async createExternalArtist(similar: SimilarArtist): Promise<Artist | null> {
    try {
      const newArtist = Artist.create({
        name: similar.name,
        mbzArtistId: similar.mbid || undefined,
        albumCount: 0,
        songCount: 0,
        playCount: 0,
        size: 0,
      });

      const created = await this.artistRepository.create(newArtist);
      this.logger.log(`Created external artist: ${similar.name} (${created.id})`);
      return created;
    } catch (error) {
      // Artist might already exist (race condition), try to find them
      this.logger.debug(`Could not create artist ${similar.name}: ${(error as Error).message}`);
      const existing = await this.artistRepository.findByNames([similar.name]);
      return existing.get(similar.name.toLowerCase()) || null;
    }
  }

  /**
   * Trigger enrichment for external artists (async, doesn't block)
   */
  private enrichExternalArtists(artistIds: string[]): void {
    // Run enrichment in background - don't await
    Promise.all(
      artistIds.map(async (id) => {
        try {
          await this.externalMetadataService.enrichArtist(id);
          this.logger.log(`Enriched external artist: ${id}`);
        } catch (error) {
          this.logger.warn(`Failed to enrich artist ${id}: ${(error as Error).message}`);
        }
      })
    ).catch(() => {
      // Ignore errors - enrichment is best-effort
    });
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
    status: 400,
    description: 'ID inválido (no es un UUID válido)'
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
