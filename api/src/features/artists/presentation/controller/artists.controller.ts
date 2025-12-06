import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetArtistUseCase, GetArtistsUseCase, GetArtistAlbumsUseCase, SearchArtistsUseCase } from '../../domain/use-cases';
import { ArtistResponseDto, GetArtistsResponseDto, SearchArtistsResponseDto } from '../dtos';
import { AlbumResponseDto } from '@features/albums/presentation/dtos';
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
  constructor(
    private readonly getArtistUseCase: GetArtistUseCase,
    private readonly getArtistsUseCase: GetArtistsUseCase,
    private readonly getArtistAlbumsUseCase: GetArtistAlbumsUseCase,
    private readonly searchArtistsUseCase: SearchArtistsUseCase,
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
