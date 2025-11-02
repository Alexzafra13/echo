import { Controller, Get, Param, Query, HttpCode, HttpStatus, Res, StreamableFile, NotFoundException, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { GetAlbumUseCase, GetAlbumsUseCase, SearchAlbumsUseCase, GetRecentAlbumsUseCase, GetFeaturedAlbumUseCase } from '../../domain/use-cases';
import { AlbumResponseDto, GetAlbumsResponseDto, SearchAlbumsResponseDto } from '../dtos';
import { TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { TrackResponseDto } from '@features/tracks/presentation/dtos';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { CoverArtService } from '@shared/services';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * AlbumsController - Controlador de álbumes
 *
 * Responsabilidades:
 * - Recibir peticiones HTTP
 * - Validar parámetros
 * - Llamar a los use cases
 * - Mapear respuestas a DTOs
 * - Retornar JSON
 */
@ApiTags('albums')
@Controller('albums')
export class AlbumsController {
  constructor(
    private readonly getAlbumUseCase: GetAlbumUseCase,
    private readonly getAlbumsUseCase: GetAlbumsUseCase,
    private readonly searchAlbumsUseCase: SearchAlbumsUseCase,
    private readonly getRecentAlbumsUseCase: GetRecentAlbumsUseCase,
    private readonly getFeaturedAlbumUseCase: GetFeaturedAlbumUseCase,
    private readonly prisma: PrismaService,
    private readonly coverArtService: CoverArtService,
    @Inject(TRACK_REPOSITORY) private readonly trackRepository: ITrackRepository,
  ) {}

  /**
   * GET /albums/recent
   * Obtener álbumes agregados recientemente
   *
   * Query params:
   * - take: número de álbumes a traer (default: 12, máximo: 50)
   */
  @Get('recent')
  @HttpCode(HttpStatus.OK)
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
    @Query('take') take: string = '12',
  ): Promise<AlbumResponseDto[]> {
    const takeNum = Math.max(1, parseInt(take, 10) || 12);

    const result = await this.getRecentAlbumsUseCase.execute({
      take: takeNum,
    });

    return result.map((album) => AlbumResponseDto.fromDomain(album));
  }

  /**
   * GET /albums/featured
   * Obtener álbum destacado para la sección hero
   */
  @Get('featured')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener álbum destacado',
    description: 'Retorna el álbum destacado para mostrar en la sección hero (generalmente el más reproducido o más reciente)'
  })
  @ApiResponse({
    status: 200,
    description: 'Álbum destacado obtenido exitosamente',
    type: AlbumResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'No hay álbumes en la librería'
  })
  async getFeaturedAlbum(): Promise<AlbumResponseDto> {
    const result = await this.getFeaturedAlbumUseCase.execute();
    return AlbumResponseDto.fromDomain(result);
  }

  /**
   * GET /albums/:id/tracks
   * Obtener todas las canciones de un álbum
   * IMPORTANTE: Debe ir ANTES de @Get(':id') para que el router lo capture correctamente
   */
  @Get(':id/tracks')
  @HttpCode(HttpStatus.OK)
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
  @ApiResponse({
    status: 404,
    description: 'Álbum no encontrado'
  })
  async getAlbumTracks(@Param('id') albumId: string): Promise<TrackResponseDto[]> {
    // Verificar que el álbum existe
    await this.getAlbumUseCase.execute({ id: albumId });

    // Obtener las canciones del álbum
    const tracks = await this.trackRepository.findByAlbumId(albumId);

    return tracks.map((track) => TrackResponseDto.fromDomain(track));
  }

  /**
   * GET /albums/:id/cover
   * Obtener cover art del álbum
   * IMPORTANTE: Debe ir ANTES de @Get(':id') para que el router lo capture correctamente
   */
  @Get(':id/cover')
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
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    // 1. Buscar el álbum
    const album = await this.prisma.album.findUnique({
      where: { id },
      select: { coverArtPath: true },
    });

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    // 2. Obtener ruta absoluta del cover desde el caché
    const coverPath = this.coverArtService.getCoverPath(album.coverArtPath);

    if (!coverPath) {
      throw new NotFoundException('No cover art found');
    }

    try {
      // 3. Leer archivo de cover
      const coverBuffer = await fs.readFile(coverPath);

      // 4. Determinar Content-Type desde la extensión
      const ext = path.extname(coverPath).toLowerCase();
      const contentType = this.getContentType(ext);

      // 5. Servir la imagen desde el caché
      res.headers({
        'Content-Type': contentType,
        'Content-Length': coverBuffer.length.toString(),
        'Cache-Control': 'public, max-age=2592000', // 30 días
      });

      res.send(coverBuffer);
    } catch (error) {
      console.error(`Error serving cover for album ${id}:`, error);
      throw new NotFoundException('Could not serve cover art');
    }
  }

  /**
   * Mapea extensión de archivo a Content-Type
   */
  private getContentType(ext: string): string {
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return contentTypes[ext] || 'image/jpeg';
  }

  /**
   * GET /albums/:id
   * Obtener UN álbum por su ID
   * IMPORTANTE: Debe ir DESPUÉS de rutas más específicas como /:id/tracks y /:id/cover
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
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
  @ApiResponse({
    status: 404,
    description: 'Álbum no encontrado'
  })
  async getAlbum(@Param('id') id: string): Promise<AlbumResponseDto> {
    const result = await this.getAlbumUseCase.execute({ id });
    return AlbumResponseDto.fromDomain(result);
  }

  /**
   * GET /albums
   * Obtener lista paginada de álbumes
   *
   * Query params:
   * - skip: número de álbumes a saltar (default: 0)
   * - take: número de álbumes a traer (default: 10, máximo: 100)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
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
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ): Promise<GetAlbumsResponseDto> {
    const skipNum = Math.max(0, parseInt(skip, 10) || 0);
    const takeNum = Math.max(1, parseInt(take, 10) || 10);

    const result = await this.getAlbumsUseCase.execute({
      skip: skipNum,
      take: takeNum,
    });

    return GetAlbumsResponseDto.fromDomain(result);
  }

  /**
   * GET /albums/search/:query
   * Buscar álbumes por nombre
   *
   * Query params:
   * - skip: número de resultados a saltar (default: 0)
   * - take: número de resultados a traer (default: 10, máximo: 100)
   */
  @Get('search/:query')
  @HttpCode(HttpStatus.OK)
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
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ): Promise<SearchAlbumsResponseDto> {
    const skipNum = Math.max(0, parseInt(skip, 10) || 0);
    const takeNum = Math.max(1, parseInt(take, 10) || 10);

    const result = await this.searchAlbumsUseCase.execute({
      query,
      skip: skipNum,
      take: takeNum,
    });

    return SearchAlbumsResponseDto.fromDomain(result);
  }
}