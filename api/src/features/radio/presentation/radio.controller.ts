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
  Sse,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Observable } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { SaveFavoriteStationUseCase } from '../domain/use-cases/save-favorite-station/save-favorite-station.use-case';
import { GetUserFavoritesUseCase } from '../domain/use-cases/get-user-favorites/get-user-favorites.use-case';
import { DeleteFavoriteStationUseCase } from '../domain/use-cases/delete-favorite-station/delete-favorite-station.use-case';
import { SearchStationsUseCase } from '../domain/use-cases/search-stations/search-stations.use-case';
import { IcyMetadataService, RadioMetadata } from '../domain/services/icy-metadata.service';
import { RadioStationResponseDto } from './dto/radio-station-response.dto';
import { SearchStationsDto } from './dto/search-stations.dto';
import { CreateCustomStationDto } from './dto/create-custom-station.dto';
import { SaveApiStationDto } from './dto/save-api-station.dto';
import * as http from 'http';
import * as https from 'https';

@ApiTags('radio')
@Controller('radio')
@UseGuards(JwtAuthGuard)
export class RadioController {
  constructor(
    private readonly saveFavoriteUseCase: SaveFavoriteStationUseCase,
    private readonly getUserFavoritesUseCase: GetUserFavoritesUseCase,
    private readonly deleteFavoriteUseCase: DeleteFavoriteStationUseCase,
    private readonly searchStationsUseCase: SearchStationsUseCase,
    private readonly icyMetadataService: IcyMetadataService
  ) {}

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

  @Get('by-country/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emisoras por país',
    description: 'Obtiene emisoras de un país específico',
  })
  async getByCountry(@Param('code') code: string, @Query('limit') limit?: number) {
    const stations = await this.searchStationsUseCase.getByCountry(code, limit || 50);
    return stations;
  }

  @Get('by-tag/:tag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emisoras por género',
    description: 'Obtiene emisoras de un género específico',
  })
  async getByTag(@Param('tag') tag: string, @Query('limit') limit?: number) {
    const stations = await this.searchStationsUseCase.getByTag(tag, limit || 50);
    return stations;
  }

  @Get('tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener géneros disponibles',
    description: 'Lista todos los géneros/tags de emisoras',
  })
  async getTags(@Query('limit') limit?: number) {
    return this.searchStationsUseCase.getTags(limit || 100);
  }

  @Get('countries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener países disponibles',
    description: 'Lista todos los países con emisoras',
  })
  async getCountries() {
    return this.searchStationsUseCase.getCountries();
  }

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

  @Post('favorites/from-api')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Guardar emisora de Radio Browser',
    description: 'Guarda una emisora de Radio Browser como favorita',
  })
  @ApiResponse({ status: 201, type: RadioStationResponseDto })
  async saveFavoriteFromApi(@CurrentUser('id') userId: string, @Body() dto: SaveApiStationDto) {
    const station = await this.saveFavoriteUseCase.execute({
      userId,
      stationData: dto,
      isCustom: false,
    });

    return RadioStationResponseDto.fromDomain(station);
  }

  @Post('favorites/custom')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear emisora personalizada',
    description: 'Crea una emisora personalizada con URL manual',
  })
  @ApiResponse({ status: 201, type: RadioStationResponseDto })
  async saveFavoriteCustom(@CurrentUser('id') userId: string, @Body() dto: CreateCustomStationDto) {
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

  @Delete('favorites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar favorito',
    description: 'Elimina una emisora de los favoritos',
  })
  @ApiResponse({ status: 204, description: 'Emisora eliminada' })
  async deleteFavorite(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) stationId: string
  ) {
    await this.deleteFavoriteUseCase.execute({ stationId, userId });
  }

  // SSE: EventSource no puede enviar JWT, metadata es pública
  @Sse('metadata/stream')
  @Public()
  @ApiOperation({
    summary: 'Stream de metadata de radio',
    description: 'Server-Sent Events que transmite metadata ICY en tiempo real (canción actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Stream de eventos de metadata',
  })
  streamMetadata(
    @Query('stationUuid') stationUuid: string,
    @Query('streamUrl') streamUrl: string,
    @Req() request: FastifyRequest
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      // Subscribe to metadata updates
      const emitter = this.icyMetadataService.subscribe(stationUuid, streamUrl);

      // Forward metadata events to SSE client
      const onMetadata = (metadata: RadioMetadata) => {
        subscriber.next({
          type: 'metadata',
          data: metadata,
        } as MessageEvent);
      };

      // Forward error events to SSE client
      const onError = (error: Error) => {
        subscriber.next({
          type: 'error',
          data: { message: error.message },
        } as MessageEvent);
      };

      emitter.on('metadata', onMetadata);
      emitter.on('error', onError);

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        subscriber.next({
          type: 'keepalive',
          data: { timestamp: Date.now() },
        } as MessageEvent);
      }, 30000);

      // Cleanup on client disconnect (use request.raw for Node.js IncomingMessage)
      request.raw.on('close', () => {
        emitter.off('metadata', onMetadata);
        emitter.off('error', onError);
        this.icyMetadataService.unsubscribe(stationUuid, emitter);
        clearInterval(keepaliveInterval);
        subscriber.complete();
      });
    });
  }

  // Proxy HTTP→HTTPS para evitar Mixed Content en el navegador
  @Get('stream/proxy')
  @Public()
  @ApiOperation({
    summary: 'Proxy de stream de radio',
    description: 'Proxy HTTP streams through HTTPS to avoid Mixed Content blocking',
  })
  async proxyStream(
    @Query('url') streamUrl: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply
  ) {
    if (!streamUrl) {
      throw new BadRequestException('Parámetro URL requerido');
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(streamUrl);
    } catch {
      throw new BadRequestException('Formato de URL inválido');
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('Solo se permiten URLs HTTP y HTTPS');
    }

    // Block private/internal networks (SSRF protection)
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^0\.0\.0\.0$/,
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^169\.254\./,
      /^\[?::1\]?$/,
      /^postgres$/,
      /^redis$/,
      /^echo$/,
    ];

    if (blockedPatterns.some((pattern) => pattern.test(hostname))) {
      throw new BadRequestException('Acceso a redes internas no permitido');
    }

    // Proxy the stream
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise<void>((resolve, reject) => {
      const proxyRequest = httpModule.get(
        streamUrl,
        {
          headers: {
            'User-Agent': 'Echo/1.0 (Radio Stream Proxy)',
            Accept: '*/*',
            'Icy-MetaData': '0',
          },
          timeout: 10000,
        },
        (proxyResponse) => {
          // Set CORS headers
          reply.header('Access-Control-Allow-Origin', '*');
          reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
          reply.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

          // Forward content type and other relevant headers
          if (proxyResponse.headers['content-type']) {
            reply.header('Content-Type', proxyResponse.headers['content-type']);
          }
          if (proxyResponse.headers['icy-name']) {
            reply.header('icy-name', proxyResponse.headers['icy-name']);
          }
          if (proxyResponse.headers['icy-br']) {
            reply.header('icy-br', proxyResponse.headers['icy-br']);
          }

          // Set status and stream the response
          reply.status(proxyResponse.statusCode || 200);
          reply.send(proxyResponse);
          resolve();
        }
      );

      proxyRequest.on('error', (error) => {
        reply
          .status(502)
          .send({ error: 'Failed to connect to radio stream', message: error.message });
        resolve();
      });

      proxyRequest.on('timeout', () => {
        proxyRequest.destroy();
        reply.status(504).send({ error: 'Radio stream connection timeout' });
        resolve();
      });

      // Handle client disconnect
      request.raw.on('close', () => {
        proxyRequest.destroy();
      });
    });
  }
}
