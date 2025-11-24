import { Injectable, Inject } from '@nestjs/common';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

export interface GetAlbumsAlphabeticallyInput {
  page: number;
  limit: number;
}

export interface GetAlbumsAlphabeticallyOutput {
  albums: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * GetAlbumsAlphabeticallyUseCase - Obtener álbumes ordenados alfabéticamente
 *
 * Responsabilidades:
 * - Validar entrada (paginación)
 * - Obtener álbumes ordenados por nombre (ignora "The", acentos, etc.)
 * - Retornar con información de paginación
 *
 * Ordenamiento:
 * - Usa orderAlbumName que ignora artículos y acentos
 * - "The Beatles" → se ordena como "Beatles"
 * - "Café Tacvba" → se ordena como "cafe tacvba"
 */
@Injectable()
export class GetAlbumsAlphabeticallyUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumsAlphabeticallyInput): Promise<GetAlbumsAlphabeticallyOutput> {
    // 1. Validar entrada
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 20)); // Entre 1 y 100
    const skip = (page - 1) * limit;

    // 2. Obtener álbumes ordenados alfabéticamente
    const [albums, total] = await Promise.all([
      this.albumRepository.findAlphabetically(skip, limit),
      this.albumRepository.count(),
    ]);

    // 3. Calcular total de páginas
    const totalPages = Math.ceil(total / limit);

    return {
      albums,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
