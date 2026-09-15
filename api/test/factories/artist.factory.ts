import { Artist, ArtistProps } from '@features/artists/domain/entities/artist.entity';

/**
 * Factory para crear instancias de Artist en tests
 * Elimina duplicación de código en +10 archivos de test
 */
export class ArtistFactory {
  /**
   * Crea un artista de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<ArtistProps>): Artist {
    return Artist.reconstruct({
      id: 'artist-123',
      name: 'Test Artist',
      albumCount: 5,
      songCount: 50,
      mbzArtistId: undefined,
      biography: 'Test biography',
      smallImageUrl: undefined,
      mediumImageUrl: undefined,
      largeImageUrl: undefined,
      externalUrl: undefined,
      externalInfoUpdatedAt: undefined,
      orderArtistName: undefined,
      size: 100000000,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea múltiples artistas
   */
  static createMany(
    count: number,
    overridesFn?: (index: number) => Partial<Record<string, unknown>>
  ): Artist[] {
    return Array.from({ length: count }, (_, i) =>
      ArtistFactory.create(
        overridesFn
          ? overridesFn(i)
          : {
              id: `artist-${i}`,
              name: `Artist ${i}`,
            }
      )
    );
  }
}
