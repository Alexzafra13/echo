import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { GetAlbumUseCase, GetAlbumsUseCase, SearchAlbumsUseCase } from '../../domain/use-cases';
import { AlbumResponseDto, GetAlbumsResponseDto, SearchAlbumsResponseDto } from '../dtos';

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
@Controller('albums')
export class AlbumsController {
  constructor(
    private readonly getAlbumUseCase: GetAlbumUseCase,
    private readonly getAlbumsUseCase: GetAlbumsUseCase,
    private readonly searchAlbumsUseCase: SearchAlbumsUseCase,
  ) {}

  /**
   * GET /albums/:id
   * Obtener UN álbum por su ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
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