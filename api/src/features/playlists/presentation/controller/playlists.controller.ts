import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RequestWithUser } from '@shared/types/request.types';
import {
  CreatePlaylistUseCase,
  GetPlaylistUseCase,
  GetPlaylistsUseCase,
  GetPlaylistsByArtistUseCase,
  UpdatePlaylistUseCase,
  DeletePlaylistUseCase,
  AddTrackToPlaylistUseCase,
  RemoveTrackFromPlaylistUseCase,
  GetPlaylistTracksUseCase,
  ReorderPlaylistTracksUseCase,
} from '../../domain/use-cases';
import {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddTrackToPlaylistDto,
  ReorderTracksDto,
  PlaylistResponseDto,
  PlaylistsListResponseDto,
  PlaylistTracksResponseDto,
} from '../dto';

@ApiTags('playlists')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class PlaylistsController {
  constructor(
    private readonly createPlaylistUseCase: CreatePlaylistUseCase,
    private readonly getPlaylistUseCase: GetPlaylistUseCase,
    private readonly getPlaylistsUseCase: GetPlaylistsUseCase,
    private readonly getPlaylistsByArtistUseCase: GetPlaylistsByArtistUseCase,
    private readonly updatePlaylistUseCase: UpdatePlaylistUseCase,
    private readonly deletePlaylistUseCase: DeletePlaylistUseCase,
    private readonly addTrackToPlaylistUseCase: AddTrackToPlaylistUseCase,
    private readonly removeTrackFromPlaylistUseCase: RemoveTrackFromPlaylistUseCase,
    private readonly getPlaylistTracksUseCase: GetPlaylistTracksUseCase,
    private readonly reorderPlaylistTracksUseCase: ReorderPlaylistTracksUseCase,
  ) {}

  /**
   * POST /playlists
   * Crear una nueva playlist
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva playlist' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Playlist creada exitosamente',
    type: PlaylistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  async createPlaylist(
    @Body() dto: CreatePlaylistDto,
    @Req() req: RequestWithUser,
  ): Promise<PlaylistResponseDto> {
    const userId = req.user.id;

    const result = await this.createPlaylistUseCase.execute({
      name: dto.name,
      description: dto.description,
      coverImageUrl: dto.coverImageUrl,
      ownerId: userId,
      public: dto.public,
    });

    return PlaylistResponseDto.fromDomain(result);
  }

  /**
   * GET /playlists/by-artist/:artistId
   * Obtener playlists que contienen tracks de un artista
   */
  @Get('by-artist/:artistId')
  @ApiOperation({ summary: 'Obtener playlists que contienen tracks de un artista' })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Registros a saltar',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Registros a obtener',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de playlists que contienen tracks del artista',
    type: PlaylistsListResponseDto,
  })
  async getPlaylistsByArtist(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Req() req: RequestWithUser,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<PlaylistsListResponseDto> {
    const userId = req.user.id;

    const result = await this.getPlaylistsByArtistUseCase.execute({
      artistId,
      userId,
      skip: skip ? parseInt(skip.toString()) : 0,
      take: take ? parseInt(take.toString()) : 20,
    });

    return PlaylistsListResponseDto.fromDomain(result);
  }

  /**
   * GET /playlists/:id
   * Obtener una playlist por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una playlist por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist encontrada',
    type: PlaylistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist no encontrada' })
  async getPlaylist(@Param('id', ParseUUIDPipe) id: string): Promise<PlaylistResponseDto> {
    const result = await this.getPlaylistUseCase.execute({ id });
    return PlaylistResponseDto.fromDomain(result);
  }

  /**
   * GET /playlists
   * Listar playlists del usuario o públicas
   */
  @Get()
  @ApiOperation({ summary: 'Listar playlists del usuario o públicas' })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de registros a saltar',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de registros a obtener',
    example: 20,
  })
  @ApiQuery({
    name: 'publicOnly',
    required: false,
    type: Boolean,
    description: 'Solo playlists públicas',
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de playlists',
    type: PlaylistsListResponseDto,
  })
  async getPlaylists(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('publicOnly') publicOnly?: boolean,
    @Req() req?: any,
  ): Promise<PlaylistsListResponseDto> {
    const userId = req?.user?.id;

    const result = await this.getPlaylistsUseCase.execute({
      ownerId: publicOnly ? undefined : userId,
      publicOnly: publicOnly ?? false,
      skip: skip ? parseInt(skip.toString()) : 0,
      take: take ? parseInt(take.toString()) : 20,
    });

    return PlaylistsListResponseDto.fromDomain(result);
  }

  /**
   * PATCH /playlists/:id
   * Actualizar una playlist
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una playlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist actualizada exitosamente',
    type: PlaylistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist no encontrada' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  async updatePlaylist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlaylistDto,
    @Req() req: RequestWithUser,
  ): Promise<PlaylistResponseDto> {
    const userId = req.user.id;

    const result = await this.updatePlaylistUseCase.execute({
      id,
      userId,
      name: dto.name,
      description: dto.description,
      coverImageUrl: dto.coverImageUrl,
      public: dto.public,
    });

    return PlaylistResponseDto.fromDomain(result);
  }

  /**
   * DELETE /playlists/:id
   * Eliminar una playlist
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una playlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist eliminada exitosamente',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Playlist deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist no encontrada' })
  async deletePlaylist(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.id;
    return this.deletePlaylistUseCase.execute({ id, userId });
  }

  /**
   * GET /playlists/:id/tracks
   * Obtener los tracks de una playlist
   */
  @Get(':id/tracks')
  @ApiOperation({ summary: 'Obtener los tracks de una playlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de tracks de la playlist',
    type: PlaylistTracksResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist no encontrada' })
  async getPlaylistTracks(@Param('id', ParseUUIDPipe) id: string): Promise<PlaylistTracksResponseDto> {
    const result = await this.getPlaylistTracksUseCase.execute({ playlistId: id });
    return PlaylistTracksResponseDto.fromDomain(result);
  }

  /**
   * POST /playlists/:id/tracks
   * Agregar un track a la playlist
   */
  @Post(':id/tracks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar un track a la playlist' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Track agregado exitosamente',
    schema: {
      properties: {
        playlistId: { type: 'string' },
        trackId: { type: 'string' },
        trackOrder: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist o Track no encontrado' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Track ya existe en la playlist' })
  async addTrackToPlaylist(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Body() dto: AddTrackToPlaylistDto,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    const userId = req.user.id;
    return this.addTrackToPlaylistUseCase.execute({
      playlistId,
      trackId: dto.trackId,
      userId,
    });
  }

  /**
   * DELETE /playlists/:id/tracks/:trackId
   * Remover un track de la playlist
   */
  @Delete(':id/tracks/:trackId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover un track de la playlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Track removido exitosamente',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist o Track no encontrado' })
  async removeTrackFromPlaylist(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.id;
    return this.removeTrackFromPlaylistUseCase.execute({
      playlistId,
      trackId,
      userId,
    });
  }

  /**
   * PUT /playlists/:id/tracks/reorder
   * Reordenar los tracks de la playlist
   */
  @Post(':id/tracks/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reordenar los tracks de la playlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tracks reordenados exitosamente',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        playlistId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist o Track no encontrado' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  async reorderPlaylistTracks(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Body() dto: ReorderTracksDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string; playlistId: string }> {
    const userId = req.user.id;
    return this.reorderPlaylistTracksUseCase.execute({
      playlistId,
      trackOrders: dto.trackOrders,
      userId,
    });
  }
}
