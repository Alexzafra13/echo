import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ListGenresUseCase,
  GetGenreUseCase,
  GetAlbumsByGenreUseCase,
  GetTracksByGenreUseCase,
  GetArtistsByGenreUseCase,
} from '../../domain/use-cases';
import {
  GenreResponseDto,
  GetGenresResponseDto,
  GetGenreAlbumsResponseDto,
  ListGenresQueryDto,
  GenreAlbumsQueryDto,
  GenreTracksQueryDto,
  GenreArtistsQueryDto,
  GenreSort,
  AlbumInGenreSort,
  TrackInGenreSort,
  ArtistInGenreSort,
  SortOrder,
} from '../dtos';
import { GetTracksResponseDto } from '@features/tracks/presentation/dtos';
import { GetArtistsResponseDto } from '@features/artists/presentation/dtos';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { ApiCommonErrors, ApiNotFoundError } from '@shared/decorators';

@ApiTags('genres')
@Controller('genres')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCommonErrors()
export class GenresController {
  constructor(
    @InjectPinoLogger(GenresController.name)
    private readonly logger: PinoLogger,
    private readonly listGenresUseCase: ListGenresUseCase,
    private readonly getGenreUseCase: GetGenreUseCase,
    private readonly getAlbumsByGenreUseCase: GetAlbumsByGenreUseCase,
    private readonly getTracksByGenreUseCase: GetTracksByGenreUseCase,
    private readonly getArtistsByGenreUseCase: GetArtistsByGenreUseCase
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar géneros disponibles',
    description:
      'Retorna los géneros de la biblioteca con counts de tracks, álbumes y artistas. Solo incluye géneros que tienen al menos un track asociado.',
  })
  @ApiResponse({ status: 200, type: GetGenresResponseDto })
  async list(@Query() query: ListGenresQueryDto): Promise<GetGenresResponseDto> {
    const result = await this.listGenresUseCase.execute({
      skip: query.skip ?? 0,
      take: query.take ?? 20,
      sort: query.sort ?? GenreSort.TrackCount,
      order: query.order ?? SortOrder.Desc,
      search: query.search,
    });

    return GetGenresResponseDto.fromDomain(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detalle de un género' })
  @ApiParam({ name: 'id', description: 'UUID del género' })
  @ApiResponse({ status: 200, type: GenreResponseDto })
  @ApiNotFoundError('Género')
  async getOne(@Param('id', ParseUUIDPipe) id: string): Promise<GenreResponseDto> {
    const genre = await this.getGenreUseCase.execute({ id });
    return GenreResponseDto.fromDomain(genre);
  }

  @Get(':id/albums')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Álbumes de un género' })
  @ApiParam({ name: 'id', description: 'UUID del género' })
  @ApiResponse({ status: 200, type: GetGenreAlbumsResponseDto })
  @ApiNotFoundError('Género')
  async getAlbums(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GenreAlbumsQueryDto
  ): Promise<GetGenreAlbumsResponseDto> {
    const result = await this.getAlbumsByGenreUseCase.execute({
      genreId: id,
      skip: query.skip ?? 0,
      take: query.take ?? 20,
      sort: query.sort ?? AlbumInGenreSort.ReleaseYear,
      order: query.order ?? SortOrder.Desc,
    });

    return GetGenreAlbumsResponseDto.fromDomain(result);
  }

  @Get(':id/tracks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tracks de un género' })
  @ApiParam({ name: 'id', description: 'UUID del género' })
  @ApiResponse({ status: 200, type: GetTracksResponseDto })
  @ApiNotFoundError('Género')
  async getTracks(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GenreTracksQueryDto
  ): Promise<GetTracksResponseDto> {
    const result = await this.getTracksByGenreUseCase.execute({
      genreId: id,
      skip: query.skip ?? 0,
      take: query.take ?? 20,
      sort: query.sort ?? TrackInGenreSort.PlayCount,
      order: query.order ?? SortOrder.Desc,
    });

    return GetTracksResponseDto.fromDomain(result);
  }

  @Get(':id/artists')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Artistas de un género' })
  @ApiParam({ name: 'id', description: 'UUID del género' })
  @ApiResponse({ status: 200, type: GetArtistsResponseDto })
  @ApiNotFoundError('Género')
  async getArtists(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GenreArtistsQueryDto
  ): Promise<GetArtistsResponseDto> {
    const result = await this.getArtistsByGenreUseCase.execute({
      genreId: id,
      skip: query.skip ?? 0,
      take: query.take ?? 20,
      sort: query.sort ?? ArtistInGenreSort.Name,
      order: query.order ?? SortOrder.Asc,
    });

    return GetArtistsResponseDto.fromDomain(result);
  }
}
