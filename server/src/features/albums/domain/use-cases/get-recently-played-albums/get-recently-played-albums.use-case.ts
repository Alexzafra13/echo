import { Injectable, Inject } from '@nestjs/common';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

export interface GetRecentlyPlayedAlbumsInput {
  userId: string;
  limit?: number;
}

export interface GetRecentlyPlayedAlbumsOutput {
  albums: Album[];
}

/**
 * GetRecentlyPlayedAlbumsUseCase - Obtener álbumes reproducidos recientemente
 *
 * Responsabilidades:
 * - Validar entrada
 * - Obtener álbumes del historial de reproducción del usuario
 * - Ordenar por última fecha de reproducción
 * - Retornar lista de álbumes
 *
 * Nota:
 * - Solo retorna álbumes que el usuario haya reproducido alguna vez
 * - Si no hay historial, retorna array vacío
 */
@Injectable()
export class GetRecentlyPlayedAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetRecentlyPlayedAlbumsInput): Promise<GetRecentlyPlayedAlbumsOutput> {
    // 1. Validar entrada
    const limit = Math.min(100, Math.max(1, input.limit || 20)); // Entre 1 y 100

    // 2. Obtener álbumes reproducidos recientemente
    const albums = await this.albumRepository.findRecentlyPlayed(input.userId, limit);

    return {
      albums,
    };
  }
}
