import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { SaveFavoriteStationUseCase } from '../domain/use-cases/save-favorite-station/save-favorite-station.use-case';
import { GetUserFavoritesUseCase } from '../domain/use-cases/get-user-favorites/get-user-favorites.use-case';
import { DeleteFavoriteStationUseCase } from '../domain/use-cases/delete-favorite-station/delete-favorite-station.use-case';
import { SearchStationsUseCase } from '../domain/use-cases/search-stations/search-stations.use-case';
import { RadioStationResponseDto } from './dto/radio-station-response.dto';
import { SearchStationsDto } from './dto/search-stations.dto';
import { CreateCustomStationDto } from './dto/create-custom-station.dto';
import { SaveApiStationDto } from './dto/save-api-station.dto';

/**
 * RadioController - Controlador de estaciones de radio
 */
@ApiTags('radio')
@Controller('radio')
export class RadioController {
  constructor(
    private readonly saveFavoriteUseCase: SaveFavoriteStationUseCase,
    private readonly getUserFavoritesUseCase: GetUserFavoritesUseCase,
    private readonly deleteFavoriteUseCase: DeleteFavoriteStationUseCase,
    private readonly searchStationsUseCase: SearchStationsUseCase,
  ) {}

  /**
   * GET /radio/search
   * Buscar emisoras en Radio Browser API
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar emisoras de radio',
    description: 'Busca emisoras en Radio Browser API con filtros',
  })
  @ApiResponse({ status: 200, description: 'Emisoras encontradas' })
  async searchStations(@Query() query: SearchStationsDto) {
    const stations = await this.searchStationsUseCase.execute(query);
    return stations;
  }

  /**
   * GET /radio/top-voted
   * Obtener emisoras más votadas
   */
  @Get('top-voted')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emisoras más votadas',
    description: 'Obtiene las emisoras con más votos de la comunidad',
  })
  async getTopVoted(@Query('limit') limit?: number) {
    const stations = await this.searchStationsUseCase.getTopVoted(limit || 20);
    return stations;
  }

  /**
   * GET /radio/popular
   * Obtener emisoras más populares por clicks
   */
  @Get('popular')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emisoras populares',
    description: 'Obtiene las emisoras más escuchadas',
  })
  async getPopular(@Query('limit') limit?: number) {
    const stations = await this.searchStationsUseCase.getPopular(limit || 20);
    return stations;
  }

  /**
   * GET /radio/by-country/:code
   * Obtener emisoras por código de país
   */
  @Get('by-country/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emisoras por país',
    description: 'Obtiene emisoras de un país específico',
  })
  async getByCountry(
    @Param('code') code: string,
    @Query('limit') limit?: number,
  ) {
    const stations = await this.searchStationsUseCase.getByCountry(
      code,
      limit || 50,
    );
    return stations;
  }

  /**
   * GET /radio/by-tag/:tag
   * Obtener emisoras por género/tag
   */
  @Get('by-tag/:tag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emisoras por género',
    description: 'Obtiene emisoras de un género específico',
  })
  async getByTag(@Param('tag') tag: string, @Query('limit') limit?: number) {
    const stations = await this.searchStationsUseCase.getByTag(
      tag,
      limit || 50,
    );
    return stations;
  }

  /**
   * GET /radio/tags
   * Obtener todos los géneros/tags disponibles
   */
  @Get('tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener géneros disponibles',
    description: 'Lista todos los géneros/tags de emisoras',
  })
  async getTags(@Query('limit') limit?: number) {
    return this.searchStationsUseCase.getTags(limit || 100);
  }

  /**
   * GET /radio/countries
   * Obtener todos los países disponibles
   */
  @Get('countries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener países disponibles',
    description: 'Lista todos los países con emisoras',
  })
  async getCountries() {
    return this.searchStationsUseCase.getCountries();
  }

  /**
   * GET /radio/favorites
   * Obtener emisoras favoritas del usuario
   */
  @Get('favorites')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener favoritos',
    description: 'Lista las emisoras favoritas del usuario autenticado',
  })
  @ApiResponse({ status: 200, type: [RadioStationResponseDto] })
  async getFavorites(@CurrentUser('id') userId: string) {
    const stations = await this.getUserFavoritesUseCase.execute(userId);
    return RadioStationResponseDto.fromDomainArray(stations);
  }

  /**
   * POST /radio/favorites/from-api
   * Guardar emisora desde Radio Browser como favorita
   */
  @Post('favorites/from-api')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Guardar emisora de Radio Browser',
    description: 'Guarda una emisora de Radio Browser como favorita',
  })
  @ApiResponse({ status: 201, type: RadioStationResponseDto })
  async saveFavoriteFromApi(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveApiStationDto,
  ) {
    const station = await this.saveFavoriteUseCase.execute({
      userId,
      stationData: dto,
      isCustom: false,
    });

    return RadioStationResponseDto.fromDomain(station);
  }

  /**
   * POST /radio/favorites/custom
   * Crear y guardar emisora personalizada
   */
  @Post('favorites/custom')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear emisora personalizada',
    description: 'Crea una emisora personalizada con URL manual',
  })
  @ApiResponse({ status: 201, type: RadioStationResponseDto })
  async saveFavoriteCustom(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomStationDto,
  ) {
    const station = await this.saveFavoriteUseCase.execute({
      userId,
      stationData: {
        name: dto.name,
        url: dto.url,
        homepage: dto.homepage,
        favicon: dto.favicon,
        country: dto.country,
        language: dto.language,
        tags: dto.tags,
        codec: dto.codec,
        bitrate: dto.bitrate,
      },
      isCustom: true,
    });

    return RadioStationResponseDto.fromDomain(station);
  }

  /**
   * DELETE /radio/favorites/:id
   * Eliminar una emisora favorita
   */
  @Delete('favorites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar favorito',
    description: 'Elimina una emisora de los favoritos',
  })
  @ApiResponse({ status: 204, description: 'Emisora eliminada' })
  async deleteFavorite(
    @CurrentUser('id') userId: string,
    @Param('id') stationId: string,
  ) {
    await this.deleteFavoriteUseCase.execute({ stationId, userId });
  }
}
