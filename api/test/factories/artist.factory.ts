import { Artist } from '@features/artists/domain/entities/artist.entity';

/**
 * Factory para crear instancias de Artist en tests
 * Elimina duplicación de código en +10 archivos de test
 */
export class ArtistFactory {
  /**
   * Crea un artista de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<{
    id: string;
    name: string;
    albumCount: number;
    songCount: number;
    mbzArtistId: string | null;
    biography: string | null;
    smallImageUrl: string | null;
    mediumImageUrl: string | null;
    largeImageUrl: string | null;
    externalUrl: string | null;
    externalInfoUpdatedAt: Date | null;
    orderArtistName: string | null;
    size: bigint;
    createdAt: Date;
    updatedAt: Date;
  }>): Artist {
    return Artist.reconstruct({
      id: 'artist-123',
      name: 'Test Artist',
      albumCount: 5,
      songCount: 50,
      mbzArtistId: null,
      biography: 'Test biography',
      smallImageUrl: null,
      mediumImageUrl: null,
      largeImageUrl: null,
      externalUrl: null,
      externalInfoUpdatedAt: null,
      orderArtistName: null,
      size: BigInt(100000000),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea múltiples artistas
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<Record<string, unknown>>): Artist[] {
    return Array.from({ length: count }, (_, i) =>
      ArtistFactory.create(overridesFn ? overridesFn(i) : {
        id: `artist-${i}`,
        name: `Artist ${i}`,
      })
    );
  }
}
