import { Injectable, Inject } from '@nestjs/common';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

export interface GetAlbumsByArtistInput {
  page: number;
  limit: number;
}

export interface GetAlbumsByArtistOutput {
  albums: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * GetAlbumsByArtistUseCase - Obtener álbumes ordenados por nombre de artista
 *
 * Responsabilidades:
 * - Validar entrada (paginación)
 * - Obtener álbumes ordenados por nombre de artista
 * - Retornar con información de paginación
 *
 * Ordenamiento:
 * - Usa orderArtistName que ignora artículos y acentos
 * - "The Beatles" → se ordena como "Beatles"
 * - Secundariamente ordena por nombre de álbum
 */
@Injectable()
export class GetAlbumsByArtistUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumsByArtistInput): Promise<GetAlbumsByArtistOutput> {
    // 1. Validar entrada
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 20)); // Entre 1 y 100
    const skip = (page - 1) * limit;

    // 2. Obtener álbumes ordenados por artista
    const [albums, total] = await Promise.all([
      this.albumRepository.findByArtistName(skip, limit),
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
