import { Controller, Get, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetTrackUseCase, GetTracksUseCase, SearchTracksUseCase, GetShuffledTracksUseCase, GetDjShuffledTracksUseCase } from '../../domain/use-cases';
import { TrackResponseDto, GetTracksResponseDto, SearchTracksResponseDto, ShuffledTracksResponseDto } from '../dtos';
import { TrackDjAnalysisDto } from '../dtos/track-dj-analysis.dto';
import { DjShuffledTracksResponseDto } from '../dtos/dj-shuffled-tracks-response.dto';
import { parsePaginationParams } from '@shared/utils';
import { ApiCommonErrors, ApiNotFoundError } from '@shared/decorators';
import { IDjAnalysisRepository, DJ_ANALYSIS_REPOSITORY } from '@features/dj/domain/ports/dj-analysis.repository.port';

@ApiTags('tracks')
@ApiBearerAuth('JWT-auth')
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly getTrackUseCase: GetTrackUseCase,
    private readonly getTracksUseCase: GetTracksUseCase,
    private readonly searchTracksUseCase: SearchTracksUseCase,
    private readonly getShuffledTracksUseCase: GetShuffledTracksUseCase,
    private readonly getDjShuffledTracksUseCase: GetDjShuffledTracksUseCase,
    @Inject(DJ_ANALYSIS_REPOSITORY)
    private readonly djAnalysisRepo: IDjAnalysisRepository,
  ) {}

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

  @Get('shuffle/dj')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener tracks con ordenamiento DJ inteligente',
    description:
      'Retorna tracks ordenados por compatibilidad armónica (BPM, Key, Energy). Si no hay suficientes tracks analizados, cae en orden aleatorio.',
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
    description: 'Tracks obtenidos con ordenamiento DJ o aleatorio (fallback)',
    type: DjShuffledTracksResponseDto,
  })
  async getDjShuffledTracks(
    @Query('seed') seed?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<DjShuffledTracksResponseDto> {
    const seedNum = seed ? parseFloat(seed) : undefined;
    const { skip: skipNum, take: takeNum } = parsePaginationParams(skip, take, { defaultTake: 50 });

    const result = await this.getDjShuffledTracksUseCase.execute({
      seed: seedNum,
      skip: skipNum,
      take: takeNum,
    });
    return DjShuffledTracksResponseDto.fromDomain(result);
  }

  @Get(':id/dj')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener análisis DJ de un track',
    description: 'Retorna el análisis DJ (BPM, Key, Camelot, Energy, Danceability) de un track específico',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del track',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis DJ del track',
    type: TrackDjAnalysisDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Track no tiene análisis DJ (retorna null)',
  })
  async getTrackDjAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TrackDjAnalysisDto | null> {
    const analysis = await this.djAnalysisRepo.findByTrackId(id);
    return TrackDjAnalysisDto.fromDomain(analysis);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiCommonErrors()
  @ApiNotFoundError('Track')
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
  async getTrack(@Param('id', ParseUUIDPipe) id: string): Promise<TrackResponseDto> {
    const result = await this.getTrackUseCase.execute({ id });
    return TrackResponseDto.fromDomain(result);
  }

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
