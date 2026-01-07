import { Controller, Get, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  GetArtistUseCase,
  GetArtistsUseCase,
  GetArtistAlbumsUseCase,
  SearchArtistsUseCase,
  GetRelatedArtistsUseCase,
  GetArtistTopTracksUseCase,
  GetArtistStatsUseCase,
} from '../../domain/use-cases';
import {
  ArtistResponseDto,
  GetArtistsResponseDto,
  SearchArtistsResponseDto,
  GetArtistAlbumsResponseDto,
  GetArtistTopTracksResponseDto,
  GetArtistStatsResponseDto,
  GetRelatedArtistsResponseDto,
} from '../dtos';
import { AlbumResponseDto } from '@features/albums/presentation/dtos';
import { parsePaginationParams } from '@shared/utils';
import { ApiCommonErrors, ApiNotFoundError } from '@shared/decorators';
import { CacheControl } from '@shared/interceptors';

@ApiTags('artists')
@ApiBearerAuth('JWT-auth')
@Controller('artists')
export class ArtistsController {
  constructor(
    private readonly getArtistUseCase: GetArtistUseCase,
    private readonly getArtistsUseCase: GetArtistsUseCase,
    private readonly getArtistAlbumsUseCase: GetArtistAlbumsUseCase,
    private readonly searchArtistsUseCase: SearchArtistsUseCase,
    private readonly getRelatedArtistsUseCase: GetRelatedArtistsUseCase,
    private readonly getArtistTopTracksUseCase: GetArtistTopTracksUseCase,
    private readonly getArtistStatsUseCase: GetArtistStatsUseCase,
  ) {}

  // Debe ir antes de @Get(':id') por orden de rutas
  @Get(':id/albums')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
  @ApiNotFoundError('Artista')
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
    type: GetArtistAlbumsResponseDto,
  })
  async getArtistAlbums(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<GetArtistAlbumsResponseDto> {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take, { defaultTake: 100 });

    const result = await this.getArtistAlbumsUseCase.execute({
      artistId,
      skip: skipNum,
      take: takeNum,
    });

    return GetArtistAlbumsResponseDto.create({
      data: result.data.map((album) => AlbumResponseDto.fromDomain(album)),
      total: result.total,
      skip: result.skip,
      take: result.take,
      hasMore: result.hasMore,
    });
  }

  @Get(':id/top-tracks')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
  @ApiNotFoundError('Artista')
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
    description: 'Top tracks del artista obtenidos exitosamente',
    type: GetArtistTopTracksResponseDto,
  })
  async getArtistTopTracks(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('limit') limit?: string,
    @Query('days') days?: string,
  ): Promise<GetArtistTopTracksResponseDto> {
    const result = await this.getArtistTopTracksUseCase.execute({
      artistId,
      limit: limit ? parseInt(limit, 10) : undefined,
      days: days ? parseInt(days, 10) : undefined,
    });

    return GetArtistTopTracksResponseDto.create(result);
  }

  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
  @ApiNotFoundError('Artista')
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
    description: 'Estadísticas del artista obtenidas exitosamente',
    type: GetArtistStatsResponseDto,
  })
  async getArtistStats(@Param('id', ParseUUIDPipe) artistId: string): Promise<GetArtistStatsResponseDto> {
    const result = await this.getArtistStatsUseCase.execute({ artistId });
    return GetArtistStatsResponseDto.create(result);
  }

  @Get(':id/related')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
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
    description: 'Artistas relacionados obtenidos exitosamente',
    type: GetRelatedArtistsResponseDto,
  })
  async getRelatedArtists(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('limit') limit?: string,
  ): Promise<GetRelatedArtistsResponseDto> {
    const result = await this.getRelatedArtistsUseCase.execute({
      artistId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return GetRelatedArtistsResponseDto.create(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
  @ApiNotFoundError('Artista')
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
  async getArtist(@Param('id', ParseUUIDPipe) id: string): Promise<ArtistResponseDto> {
    const result = await this.getArtistUseCase.execute({ id });
    return ArtistResponseDto.fromDomain(result);
  }

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
