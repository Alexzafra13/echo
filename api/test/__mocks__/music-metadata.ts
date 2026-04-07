/**
 * Mock de music-metadata para tests E2E
 *
 * music-metadata es un módulo ES puro que Jest no puede importar directamente.
 * Este mock proporciona las funciones necesarias para los tests.
 */

export const parseFile = jest.fn().mockResolvedValue({
  format: {
    duration: 180,
    bitrate: 320000,
    sampleRate: 44100,
    numberOfChannels: 2,
    codec: 'MP3',
    container: 'MPEG',
  },
  common: {
    title: 'Mock Track',
    artist: 'Mock Artist',
    album: 'Mock Album',
    year: 2024,
    track: { no: 1, of: 10 },
    disk: { no: 1, of: 1 },
    genre: ['Rock'],
    picture: undefined,
  },
  native: {},
  quality: { warnings: [] },
});

export const parseStream = jest.fn().mockResolvedValue({
  format: {
    duration: 180,
    bitrate: 320000,
    sampleRate: 44100,
  },
  common: {
    title: 'Mock Track',
    artist: 'Mock Artist',
  },
});

export const parseBuffer = jest.fn().mockResolvedValue({
  format: {},
  common: {},
});

export default {
  parseFile,
  parseStream,
  parseBuffer,
};
