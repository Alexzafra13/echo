import { Playlist } from '@features/playlists/domain/entities/playlist.entity';

/**
 * Factory para crear instancias de Playlist en tests
 * Elimina duplicación de código en varios archivos de test
 */
export class PlaylistFactory {
  /**
   * Crea una playlist de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<{
    id: string;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    duration: number;
    size: bigint;
    ownerId: string;
    public: boolean;
    songCount: number;
    path: string | null;
    sync: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>): Playlist {
    return Playlist.fromPrimitives({
      id: 'playlist-123',
      name: 'Test Playlist',
      description: 'Test description',
      coverImageUrl: null,
      duration: 600,
      size: BigInt(25000000),
      ownerId: 'user-123',
      public: false,
      songCount: 5,
      path: null,
      sync: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea una playlist pública
   */
  static createPublic(overrides?: Partial<Record<string, unknown>>): Playlist {
    return PlaylistFactory.create({
      public: true,
      ...overrides,
    });
  }

  /**
   * Crea múltiples playlists
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<Record<string, unknown>>): Playlist[] {
    return Array.from({ length: count }, (_, i) =>
      PlaylistFactory.create(overridesFn ? overridesFn(i) : {
        id: `playlist-${i}`,
        name: `Playlist ${i}`,
      })
    );
  }
}
