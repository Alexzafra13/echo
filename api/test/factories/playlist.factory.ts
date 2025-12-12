import { Playlist, PlaylistProps } from '@features/playlists/domain/entities/playlist.entity';

/**
 * Factory para crear instancias de Playlist en tests
 * Elimina duplicación de código en varios archivos de test
 */
export class PlaylistFactory {
  /**
   * Crea una playlist de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<PlaylistProps>): Playlist {
    return Playlist.fromPrimitives({
      id: 'playlist-123',
      name: 'Test Playlist',
      description: 'Test description',
      coverImageUrl: undefined,
      duration: 600,
      size: 25000000,
      ownerId: 'user-123',
      public: false,
      songCount: 5,
      path: undefined,
      sync: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea una playlist pública
   */
  static createPublic(overrides?: Partial<PlaylistProps>): Playlist {
    return PlaylistFactory.create({
      public: true,
      ...overrides,
    });
  }

  /**
   * Crea múltiples playlists
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<PlaylistProps>): Playlist[] {
    return Array.from({ length: count }, (_, i) =>
      PlaylistFactory.create(overridesFn ? overridesFn(i) : {
        id: `playlist-${i}`,
        name: `Playlist ${i}`,
      })
    );
  }
}
