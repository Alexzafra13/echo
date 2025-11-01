import { Controller, Get, Param, Query, HttpCode, HttpStatus, Res, StreamableFile, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { GetAlbumUseCase, GetAlbumsUseCase, SearchAlbumsUseCase, GetRecentAlbumsUseCase, GetFeaturedAlbumUseCase } from '../../domain/use-cases';
import { AlbumResponseDto, GetAlbumsResponseDto, SearchAlbumsResponseDto } from '../dtos';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { parseFile } from 'music-metadata';

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
   * GET /albums/:id
   * Obtener UN álbum por su ID
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
   * GET /albums/:id/cover
   * Obtener cover art del álbum
   */
  @Get(':id/cover')
  @ApiOperation({
    summary: 'Obtener cover art del álbum',
    description: 'Extrae y retorna la imagen de portada del álbum desde el primer track'
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
      include: {
        tracks: {
          take: 1,
          orderBy: { trackNumber: 'asc' },
        },
      },
    });

    if (!album || !album.tracks || album.tracks.length === 0) {
      throw new NotFoundException('Album or tracks not found');
    }

    // 2. Obtener el primer track del álbum
    const firstTrack = album.tracks[0];

    try {
      // 3. Extraer metadata del archivo de audio
      const metadata = await parseFile(firstTrack.path);

      // 4. Buscar la cover art
      const picture = metadata.common.picture?.[0];

      if (!picture || !picture.data) {
        throw new NotFoundException('No cover art found');
      }

      // 5. Servir la imagen
      res.headers({
        'Content-Type': picture.format || 'image/jpeg',
        'Content-Length': picture.data.length.toString(),
        'Cache-Control': 'public, max-age=2592000', // 30 días
      });

      res.send(picture.data);
    } catch (error) {
      console.error(`Error extracting cover for album ${id}:`, error);
      throw new NotFoundException('Could not extract cover art');
    }
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