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
  AddTrackToPlaylistResponseDto,
  ReorderTracksDto,
  PlaylistResponseDto,
  PlaylistsListResponseDto,
  PlaylistTracksResponseDto,
} from '../dto';
import { validatePagination } from '@shared/utils';

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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una playlist por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist encontrada',
    type: PlaylistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist no encontrada' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'No tienes acceso a esta playlist' })
  async getPlaylist(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<PlaylistResponseDto> {
    const result = await this.getPlaylistUseCase.execute({
      id,
      requesterId: req.user.id,
    });
    return PlaylistResponseDto.fromDomain(result);
  }

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

    const { skip: skipNum, take: takeNum } = validatePagination(skip, take, {
      maxTake: 100,
      defaultTake: 20,
    });

    const result = await this.getPlaylistsUseCase.execute({
      ownerId: publicOnly ? undefined : userId,
      publicOnly: publicOnly ?? false,
      skip: skipNum,
      take: takeNum,
    });

    return PlaylistsListResponseDto.fromDomain(result);
  }

  @Get('by-artist/:artistId')
  @ApiOperation({ summary: 'Obtener playlists públicas que contienen canciones de un artista' })
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de playlists públicas del artista',
    type: PlaylistsListResponseDto,
  })
  async getPlaylistsByArtist(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<PlaylistsListResponseDto> {
    const { skip: skipNum, take: takeNum } = validatePagination(skip, take, {
      maxTake: 100,
      defaultTake: 20,
    });

    const result = await this.getPlaylistsByArtistUseCase.execute({
      artistId,
      skip: skipNum,
      take: takeNum,
    });

    return PlaylistsListResponseDto.fromDomain(result);
  }

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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una playlist' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Playlist eliminada exitosamente',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist no encontrada' })
  async deletePlaylist(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const userId = req.user.id;
    await this.deletePlaylistUseCase.execute({ id, userId });
  }

  @Get(':id/tracks')
  @ApiOperation({ summary: 'Obtener los tracks de una playlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de tracks de la playlist',
    type: PlaylistTracksResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist no encontrada' })
  async getPlaylistTracks(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<PlaylistTracksResponseDto> {
    const result = await this.getPlaylistTracksUseCase.execute({
      playlistId: id,
      requesterId: req.user.id,
    });
    return PlaylistTracksResponseDto.fromDomain(result);
  }

  @Post(':id/tracks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar un track a la playlist' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Track agregado exitosamente',
    type: AddTrackToPlaylistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Playlist o Track no encontrado' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Track ya existe en la playlist' })
  async addTrackToPlaylist(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Body() dto: AddTrackToPlaylistDto,
    @Req() req: RequestWithUser,
  ): Promise<AddTrackToPlaylistResponseDto> {
    const userId = req.user.id;
    const result = await this.addTrackToPlaylistUseCase.execute({
      playlistId,
      trackId: dto.trackId,
      userId,
    });
    return AddTrackToPlaylistResponseDto.fromDomain(result);
  }

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
