import { Controller, Get, Param, Query, HttpCode, HttpStatus, Res, UseGuards, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FastifyReply } from 'fastify';
import { GetAlbumUseCase, GetAlbumsUseCase, SearchAlbumsUseCase, GetRecentAlbumsUseCase, GetTopPlayedAlbumsUseCase, GetFeaturedAlbumUseCase, GetAlbumTracksUseCase, GetAlbumCoverUseCase } from '../../domain/use-cases';
import { GetAlbumsAlphabeticallyUseCase } from '../../domain/use-cases/get-albums-alphabetically/get-albums-alphabetically.use-case';
import { GetAlbumsByArtistUseCase } from '../../domain/use-cases/get-albums-by-artist/get-albums-by-artist.use-case';
import { GetRecentlyPlayedAlbumsUseCase } from '../../domain/use-cases/get-recently-played-albums/get-recently-played-albums.use-case';
import { GetFavoriteAlbumsUseCase } from '../../domain/use-cases/get-favorite-albums/get-favorite-albums.use-case';
import {
  AlbumResponseDto,
  GetAlbumsResponseDto,
  SearchAlbumsResponseDto,
  GetAlbumsPaginatedResponseDto,
  GetRecentlyPlayedAlbumsResponseDto,
  GetFavoriteAlbumsResponseDto,
} from '../dtos';
import { AlbumsPaginationQueryDto, AlbumsLimitQueryDto } from '../dtos/albums-sort.query.dto';
import { TrackResponseDto } from '@features/tracks/presentation/dtos';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { parsePaginationParams } from '@shared/utils';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser, ApiCommonErrors, ApiNotFoundError } from '@shared/decorators';
import { JwtUser } from '@shared/types/request.types';
import { CacheControl } from '@shared/interceptors';

@ApiTags('albums')
@Controller('albums')
export class AlbumsController {
  constructor(
    @InjectPinoLogger(AlbumsController.name)
    private readonly logger: PinoLogger,
    private readonly getAlbumUseCase: GetAlbumUseCase,
    private readonly getAlbumsUseCase: GetAlbumsUseCase,
    private readonly searchAlbumsUseCase: SearchAlbumsUseCase,
    private readonly getRecentAlbumsUseCase: GetRecentAlbumsUseCase,
    private readonly getTopPlayedAlbumsUseCase: GetTopPlayedAlbumsUseCase,
    private readonly getFeaturedAlbumUseCase: GetFeaturedAlbumUseCase,
    private readonly getAlbumTracksUseCase: GetAlbumTracksUseCase,
    private readonly getAlbumCoverUseCase: GetAlbumCoverUseCase,
    private readonly getAlbumsAlphabeticallyUseCase: GetAlbumsAlphabeticallyUseCase,
    private readonly getAlbumsByArtistUseCase: GetAlbumsByArtistUseCase,
    private readonly getRecentlyPlayedAlbumsUseCase: GetRecentlyPlayedAlbumsUseCase,
    private readonly getFavoriteAlbumsUseCase: GetFavoriteAlbumsUseCase,
  ) {}

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  @CacheControl(60) // 1 minute cache
  @ApiOperation({
    summary: 'Obtener álbumes recientes',
    description: 'Retorna los álbumes más recientemente agregados a la librería'
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de álbumes a retornar (1-50)',
    example: 12
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes recientes obtenida exitosamente',
    type: [AlbumResponseDto]
  })
  async getRecentAlbums(
    @Query('take') take?: string,
  ): Promise<AlbumResponseDto[]> {
    const { take: takeNum } = parsePaginationParams(undefined, take, {
      defaultTake: 12,
      maxTake: 50,
    });

    const result = await this.getRecentAlbumsUseCase.execute({
      take: takeNum,
    });

    return result.map((album) => AlbumResponseDto.fromDomain(album));
  }

  @Get('top-played')
  @HttpCode(HttpStatus.OK)
  @CacheControl(300) // 5 minute cache (stats based)
  @ApiOperation({
    summary: 'Obtener álbumes más reproducidos',
    description: 'Retorna los álbumes con más reproducciones basado en estadísticas reales de reproducción del usuario'
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de álbumes a retornar (1-50)',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes más reproducidos obtenida exitosamente',
    type: [AlbumResponseDto]
  })
  async getTopPlayedAlbums(
    @Query('take') take?: string,
  ): Promise<AlbumResponseDto[]> {
    const { take: takeNum } = parsePaginationParams(undefined, take, {
      defaultTake: 10,
      maxTake: 50,
    });

    const result = await this.getTopPlayedAlbumsUseCase.execute({
      take: takeNum,
    });

    return result.map((album) => AlbumResponseDto.fromDomain(album));
  }

  @Get('alphabetical')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener álbumes ordenados alfabéticamente',
    description: 'Retorna álbumes ordenados por nombre (ignora artículos como "The", "A", etc. y acentos)'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (empieza en 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Álbumes por página (1-100)',
    example: 20
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes ordenados alfabéticamente obtenida exitosamente',
    type: GetAlbumsPaginatedResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token inválido'
  })
  async getAlbumsAlphabetically(
    @Query() query: AlbumsPaginationQueryDto,
  ): Promise<GetAlbumsPaginatedResponseDto> {
    const result = await this.getAlbumsAlphabeticallyUseCase.execute({
      page: query.page || 1,
      limit: query.limit || 20,
    });

    return GetAlbumsPaginatedResponseDto.create({
      data: result.albums.map(album => AlbumResponseDto.fromDomain(album)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }

  @Get('by-artist')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener álbumes ordenados por artista',
    description: 'Retorna álbumes ordenados por nombre de artista (ignora artículos como "The", "A", etc. y acentos)'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (empieza en 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Álbumes por página (1-100)',
    example: 20
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes ordenados por artista obtenida exitosamente',
    type: GetAlbumsPaginatedResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token inválido'
  })
  async getAlbumsByArtist(
    @Query() query: AlbumsPaginationQueryDto,
  ): Promise<GetAlbumsPaginatedResponseDto> {
    const result = await this.getAlbumsByArtistUseCase.execute({
      page: query.page || 1,
      limit: query.limit || 20,
    });

    return GetAlbumsPaginatedResponseDto.create({
      data: result.albums.map(album => AlbumResponseDto.fromDomain(album)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }

  @Get('recently-played')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener álbumes reproducidos recientemente',
    description: 'Retorna álbumes del historial de reproducción del usuario, ordenados por última reproducción'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Número de álbumes a retornar (1-100)',
    example: 20
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes reproducidos recientemente obtenida exitosamente',
    type: GetRecentlyPlayedAlbumsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token inválido'
  })
  async getRecentlyPlayedAlbums(
    @CurrentUser() user: JwtUser,
    @Query() query: AlbumsLimitQueryDto,
  ): Promise<GetRecentlyPlayedAlbumsResponseDto> {
    const result = await this.getRecentlyPlayedAlbumsUseCase.execute({
      userId: user.id,
      limit: query.limit || 20,
    });

    return GetRecentlyPlayedAlbumsResponseDto.create({
      data: result.albums.map(album => AlbumResponseDto.fromDomain(album)),
    });
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener álbumes favoritos',
    description: 'Retorna álbumes marcados como favoritos (like) por el usuario, ordenados por fecha de like'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (empieza en 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Álbumes por página (1-100)',
    example: 20
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes favoritos obtenida exitosamente',
    type: GetFavoriteAlbumsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token inválido'
  })
  async getFavoriteAlbums(
    @CurrentUser() user: JwtUser,
    @Query() query: AlbumsPaginationQueryDto,
  ): Promise<GetFavoriteAlbumsResponseDto> {
    const result = await this.getFavoriteAlbumsUseCase.execute({
      userId: user.id,
      page: query.page || 1,
      limit: query.limit || 20,
    });

    return GetFavoriteAlbumsResponseDto.create({
      data: result.albums.map(album => AlbumResponseDto.fromDomain(album)),
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  }

  @Get('featured')
  @HttpCode(HttpStatus.OK)
  @CacheControl(300) // 5 minute cache
  @ApiCommonErrors()
  @ApiNotFoundError('Álbum destacado')
  @ApiOperation({
    summary: 'Obtener álbum destacado',
    description: 'Retorna el álbum destacado para mostrar en la sección hero (generalmente el más reproducido o más reciente)'
  })
  @ApiResponse({
    status: 200,
    description: 'Álbum destacado obtenido exitosamente',
    type: AlbumResponseDto
  })
  async getFeaturedAlbum(): Promise<AlbumResponseDto> {
    const result = await this.getFeaturedAlbumUseCase.execute();
    if (!result) {
      throw new NotFoundException('No hay álbumes en la librería');
    }
    return AlbumResponseDto.fromDomain(result);
  }

  // Debe ir antes de @Get(':id') por orden de rutas
  @Get(':id/tracks')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
  @ApiNotFoundError('Álbum')
  @ApiOperation({
    summary: 'Obtener canciones del álbum',
    description: 'Retorna todas las canciones (tracks) de un álbum específico, ordenadas por disco y número de pista'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del álbum',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de canciones obtenida exitosamente',
    type: [TrackResponseDto]
  })
  async getAlbumTracks(@Param('id', ParseUUIDPipe) albumId: string): Promise<TrackResponseDto[]> {
    const result = await this.getAlbumTracksUseCase.execute({ albumId });
    return result.tracks.map((track: Track) => TrackResponseDto.fromDomain(track));
  }

  @Get(':id/cover')
  @ApiCommonErrors()
  @ApiNotFoundError('Álbum')
  @ApiOperation({
    summary: 'Obtener cover art del álbum',
    description: 'Sirve la imagen de portada del álbum desde el caché'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del álbum',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Cover art obtenida exitosamente',
    schema: { type: 'string', format: 'binary' }
  })
  @ApiResponse({
    status: 404,
    description: 'Álbum no encontrado o sin cover art'
  })
  async getAlbumCover(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const result = await this.getAlbumCoverUseCase.execute({ albumId: id });

    res.headers({
      'Content-Type': result.mimeType,
      'Content-Length': result.fileSize.toString(),
      'Cache-Control': 'public, max-age=2592000', // 30 días
    });

    res.send(result.buffer);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
  @ApiNotFoundError('Álbum')
  @ApiOperation({
    summary: 'Obtener álbum por ID',
    description: 'Retorna la información completa de un álbum específico por su identificador UUID'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del álbum',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Álbum encontrado exitosamente',
    type: AlbumResponseDto
  })
  async getAlbum(@Param('id', ParseUUIDPipe) id: string): Promise<AlbumResponseDto> {
    const result = await this.getAlbumUseCase.execute({ id });
    return AlbumResponseDto.fromDomain(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @CacheControl(60) // 1 minute cache
  @ApiOperation({
    summary: 'Listar álbumes',
    description: 'Retorna una lista paginada de todos los álbumes disponibles en el servidor'
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
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de álbumes obtenida exitosamente',
    type: GetAlbumsResponseDto
  })
  async getAlbums(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<GetAlbumsResponseDto> {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take);

    const result = await this.getAlbumsUseCase.execute({
      skip: skipNum,
      take: takeNum,
    });

    return GetAlbumsResponseDto.fromDomain(result);
  }

  @Get('search/:query')
  @HttpCode(HttpStatus.OK)
  @CacheControl(30) // 30 second cache for search
  @ApiOperation({
    summary: 'Buscar álbumes',
    description: 'Busca álbumes por nombre (mínimo 2 caracteres). La búsqueda es case-insensitive y busca coincidencias parciales'
  })
  @ApiParam({
    name: 'query',
    type: String,
    description: 'Término de búsqueda (mínimo 2 caracteres)',
    example: 'Abbey'
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
    type: SearchAlbumsResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Query inválido (vacío o menor a 2 caracteres)'
  })
  async searchAlbums(
    @Param('query') query: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<SearchAlbumsResponseDto> {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take);

    const result = await this.searchAlbumsUseCase.execute({
      query,
      skip: skipNum,
      take: takeNum,
    });

    return SearchAlbumsResponseDto.fromDomain(result);
  }
}