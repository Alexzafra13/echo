import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { GetArtistInput, GetArtistOutput } from './get-artist.dto';

/**
 * GetArtistUseCase - Obtener un artista por ID
 *
 * Responsabilidades:
 * - Validar ID del artista
 * - Buscar artista en el repositorio
 * - Lanzar error si no existe
 * - Retornar datos del artista
 */
@Injectable()
export class GetArtistUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: IArtistRepository,
  ) {}

  async execute(input: GetArtistInput): Promise<GetArtistOutput> {
    // 1. Validar ID
    if (!input.id || input.id.trim() === '') {
      throw new NotFoundError('Artist', 'invalid-id');
    }

    // 2. Buscar artista
    const artist = await this.artistRepository.findById(input.id);

    // 3. Validar existencia
    if (!artist) {
      throw new NotFoundError('Artist', input.id);
    }

    // 4. Retornar
    return {
      id: artist.id,
      name: artist.name,
      albumCount: artist.albumCount,
      songCount: artist.songCount,
      playCount: artist.playCount,
      mbzArtistId: artist.mbzArtistId,
      biography: artist.biography,
      smallImageUrl: artist.smallImageUrl,
      mediumImageUrl: artist.mediumImageUrl,
      largeImageUrl: artist.largeImageUrl,
      externalUrl: artist.externalUrl,
      externalInfoUpdatedAt: artist.externalInfoUpdatedAt,
      orderArtistName: artist.orderArtistName,
      size: artist.size,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
    };
  }
}
