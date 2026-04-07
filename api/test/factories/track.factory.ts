import { Track } from '@features/tracks/domain/entities/track.entity';

/**
 * Factory para crear instancias de Track en tests
 * Elimina duplicación de código en +15 archivos de test
 */
export class TrackFactory {
  /**
   * Crea un track de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<{
    id: string;
    title: string;
    duration: number;
    size: bigint;
    trackNumber: number;
    filePath: string;
    coverPath: string | null;
    year: number | null;
    artistId: string;
    albumId: string;
    genre: string | null;
    format: string;
    bitrate: number;
    createdAt: Date;
    updatedAt: Date;
  }>): Track {
    return Track.reconstruct({
      id: 'track-123',
      title: 'Test Track',
      duration: 180,
      size: BigInt(5000000),
      trackNumber: 1,
      filePath: '/music/test-track.mp3',
      coverPath: null,
      year: 2024,
      artistId: 'artist-123',
      albumId: 'album-123',
      genre: 'Rock',
      format: 'mp3',
      bitrate: 320,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea múltiples tracks
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<Record<string, unknown>>): Track[] {
    return Array.from({ length: count }, (_, i) =>
      TrackFactory.create(overridesFn ? overridesFn(i) : {
        id: `track-${i}`,
        title: `Track ${i}`,
        trackNumber: i + 1,
      })
    );
  }
}
