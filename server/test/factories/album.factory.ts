import { Album } from '@features/albums/domain/entities/album.entity';

/**
 * Factory para crear instancias de Album en tests
 * Elimina duplicación de código en +10 archivos de test
 */
export class AlbumFactory {
  /**
   * Crea un álbum de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<{
    id: string;
    title: string;
    artistId: string;
    releaseDate: Date | null;
    coverPath: string | null;
    externalCoverPath: string | null;
    mbzAlbumId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>): Album {
    return Album.reconstruct({
      id: 'album-123',
      title: 'Test Album',
      artistId: 'artist-123',
      releaseDate: new Date('2024-01-01'),
      coverPath: '/covers/test-album.jpg',
      externalCoverPath: null,
      mbzAlbumId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea múltiples álbumes
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<any>): Album[] {
    return Array.from({ length: count }, (_, i) =>
      AlbumFactory.create(overridesFn ? overridesFn(i) : {
        id: `album-${i}`,
        title: `Album ${i}`,
      })
    );
  }
}
