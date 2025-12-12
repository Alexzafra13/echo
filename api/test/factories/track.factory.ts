import { Track, TrackProps } from '@features/tracks/domain/entities/track.entity';

/**
 * Factory para crear instancias de Track en tests
 * Elimina duplicación de código en +15 archivos de test
 */
export class TrackFactory {
  /**
   * Crea un track de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<TrackProps>): Track {
    return Track.reconstruct({
      id: 'track-123',
      title: 'Test Track',
      duration: 180,
      size: 5000000,
      trackNumber: 1,
      discNumber: 1,
      path: '/music/test-track.mp3',
      year: 2024,
      artistId: 'artist-123',
      albumId: 'album-123',
      albumArtistId: undefined,
      artistName: 'Test Artist',
      albumName: 'Test Album',
      albumArtistName: undefined,
      suffix: 'mp3',
      bitRate: 320,
      compilation: false,
      playCount: 0,
      lyrics: undefined,
      comment: undefined,
      rgTrackGain: undefined,
      rgTrackPeak: undefined,
      rgAlbumGain: undefined,
      rgAlbumPeak: undefined,
      missingAt: undefined,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea múltiples tracks
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<TrackProps>): Track[] {
    return Array.from({ length: count }, (_, i) =>
      TrackFactory.create(overridesFn ? overridesFn(i) : {
        id: `track-${i}`,
        title: `Track ${i}`,
        trackNumber: i + 1,
      })
    );
  }
}
