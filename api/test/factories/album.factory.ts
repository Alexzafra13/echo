import { Album, AlbumProps } from '@features/albums/domain/entities/album.entity';

/**
 * Factory para crear instancias de Album en tests
 * Elimina duplicación de código en +10 archivos de test
 */
export class AlbumFactory {
  /**
   * Crea un álbum de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<AlbumProps>): Album {
    return Album.reconstruct({
      id: 'album-123',
      name: 'Test Album',
      artistId: 'artist-123',
      artistName: 'Test Artist',
      albumArtistId: undefined,
      coverArtPath: '/covers/test-album.jpg',
      year: 2024,
      releaseDate: new Date('2024-01-01'),
      compilation: false,
      songCount: 10,
      duration: 2400, // 40 minutos en segundos
      size: 100000000, // ~100MB
      description: 'A test album',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea un álbum de compilación (varios artistas)
   */
  static createCompilation(overrides?: Partial<AlbumProps>): Album {
    return AlbumFactory.create({
      id: 'compilation-123',
      name: 'Greatest Hits Collection',
      artistId: undefined,
      artistName: 'Various Artists',
      compilation: true,
      ...overrides,
    });
  }

  /**
   * Crea un álbum sin carátula
   */
  static createWithoutCover(overrides?: Partial<AlbumProps>): Album {
    return AlbumFactory.create({
      coverArtPath: undefined,
      ...overrides,
    });
  }

  /**
   * Crea múltiples álbumes
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<AlbumProps>): Album[] {
    return Array.from({ length: count }, (_, i) =>
      AlbumFactory.create(overridesFn ? overridesFn(i) : {
        id: `album-${i}`,
        name: `Album ${i}`,
      })
    );
  }
}
