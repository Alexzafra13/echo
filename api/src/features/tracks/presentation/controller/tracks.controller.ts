import { Controller, Get, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetTrackUseCase, GetTracksUseCase, SearchTracksUseCase, GetShuffledTracksUseCase } from '../../domain/use-cases';
import { TrackResponseDto, GetTracksResponseDto, SearchTracksResponseDto, ShuffledTracksResponseDto } from '../dtos';
import { parsePaginationParams } from '@shared/utils';

/**
 * TracksController - Controlador de tracks
 *
 * Responsabilidades:
 * - Recibir peticiones HTTP
 * - Validar parámetros
 * - Llamar a los use cases
 * - Mapear respuestas a DTOs
 * - Retornar JSON
 */
@ApiTags('tracks')
@ApiBearerAuth('JWT-auth')
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly getTrackUseCase: GetTrackUseCase,
    private readonly getTracksUseCase: GetTracksUseCase,
    private readonly searchTracksUseCase: SearchTracksUseCase,
    private readonly getShuffledTracksUseCase: GetShuffledTracksUseCase,
  ) {}

  /**
   * GET /tracks/shuffle
   * Obtener tracks en orden aleatorio con paginación
   *
   * Query params:
   * - seed: valor para orden determinístico (opcional, se genera si no se provee)
   * - skip: número de tracks a saltar (default: 0)
   * - take: número de tracks a traer (default: 50, máximo: 100)
   */
  @Get('shuffle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener tracks aleatorios con paginación',
    description:
      'Retorna tracks en orden aleatorio determinístico. Usa el mismo seed para paginar la misma secuencia.',
  })
  @ApiQuery({
    name: 'seed',
    required: false,
    type: Number,
    description: 'Seed para orden determinístico (0-1). Si no se provee, se genera uno nuevo.',
    example: 0.123456789,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de tracks a omitir (para paginación)',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de tracks a retornar (1-100)',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Tracks obtenidos exitosamente en orden aleatorio',
    type: ShuffledTracksResponseDto,
  })
  async getShuffledTracks(
    @Query('seed') seed?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ShuffledTracksResponseDto> {
    const seedNum = seed ? parseFloat(seed) : undefined;
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take, { defaultTake: 50 });

    const result = await this.getShuffledTracksUseCase.execute({
      seed: seedNum,
      skip: skipNum,
      take: takeNum,
    });
    return ShuffledTracksResponseDto.fromDomain(result);
  }

  /**
   * GET /tracks/:id
   * Obtener UN track por su ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener track por ID',
    description: 'Retorna la información completa de un track específico por su identificador UUID'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del track',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Track encontrado exitosamente',
    type: TrackResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Track no encontrado'
  })
  async getTrack(@Param('id', ParseUUIDPipe) id: string): Promise<TrackResponseDto> {
    const result = await this.getTrackUseCase.execute({ id });
    return TrackResponseDto.fromDomain(result);
  }

  /**
   * GET /tracks
   * Obtener lista paginada de tracks
   *
   * Query params:
   * - skip: número de tracks a saltar (default: 0)
   * - take: número de tracks a traer (default: 10, máximo: 100)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar tracks',
    description: 'Retorna una lista paginada de todos los tracks disponibles en el servidor'
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de tracks a omitir (para paginación)',
    example: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de tracks a retornar (1-100)',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tracks obtenida exitosamente',
    type: GetTracksResponseDto
  })
  async getTracks(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<GetTracksResponseDto> {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take);

    const result = await this.getTracksUseCase.execute({
      skip: skipNum,
      take: takeNum,
    });

    return GetTracksResponseDto.fromDomain(result);
  }

  /**
   * GET /tracks/search/:query
   * Buscar tracks por título
   *
   * Query params:
   * - skip: número de resultados a saltar (default: 0)
   * - take: número de resultados a traer (default: 10, máximo: 100)
   */
  @Get('search/:query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar tracks',
    description: 'Busca tracks por título (mínimo 2 caracteres). La búsqueda es case-insensitive y busca coincidencias parciales'
  })
  @ApiParam({
    name: 'query',
    type: String,
    description: 'Término de búsqueda (mínimo 2 caracteres)',
    example: 'Come'
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
    type: SearchTracksResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Query inválido (vacío o menor a 2 caracteres)'
  })
  async searchTracks(
    @Param('query') query: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<SearchTracksResponseDto> {
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take);

    const result = await this.searchTracksUseCase.execute({
      query,
      skip: skipNum,
      take: takeNum,
    });

    return SearchTracksResponseDto.fromDomain(result);
  }
}
