jest.mock('music-metadata');

import { parseFile } from 'music-metadata';
import { MetadataExtractorService } from './metadata-extractor.service';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { PinoLogger } from 'nestjs-pino';
import type { IAudioMetadata } from 'music-metadata';

describe('MetadataExtractorService', () => {
  let service: MetadataExtractorService;
  const mockLogger = createMockPinoLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MetadataExtractorService(mockLogger as unknown as PinoLogger);
  });

  const createMockMetadata = (
    overrides: {
      common?: Partial<IAudioMetadata['common']>;
      format?: Partial<IAudioMetadata['format']>;
    } = {}
  ): IAudioMetadata =>
    ({
      common: {
        title: 'Test Song',
        artist: 'Test Artist',
        albumartist: 'Album Artist',
        album: 'Test Album',
        year: 2024,
        genre: ['Rock', 'Alternative'],
        track: { no: 3, of: 12 },
        disk: { no: 1, of: 1 },
        bpm: 120.5,
        key: 'Am',
        comment: undefined,
        lyrics: undefined,
        compilation: false,
        picture: [],
        ...overrides.common,
      },
      format: {
        duration: 245.678,
        bitrate: 320000,
        sampleRate: 44100,
        numberOfChannels: 2,
        codec: 'MPEG 1 Layer 3',
        ...overrides.format,
      },
    }) as unknown as IAudioMetadata;

  describe('extractMetadata', () => {
    it('should extract basic metadata fields', async () => {
      (parseFile as jest.Mock).mockResolvedValue(createMockMetadata());

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Test Song');
      expect(result!.artist).toBe('Test Artist');
      expect(result!.albumArtist).toBe('Album Artist');
      expect(result!.album).toBe('Test Album');
      expect(result!.year).toBe(2024);
      expect(result!.genre).toEqual(['Rock', 'Alternative']);
    });

    it('should round duration to integer', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({ format: { duration: 245.678 } })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.duration).toBe(246); // Math.round
    });

    it('should round bitRate to integer', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({ format: { bitrate: 319876 } })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.bitRate).toBe(319876); // Math.round
    });

    it('should extract track and disc numbers', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: { track: { no: 5, of: 12 }, disk: { no: 2, of: 2 } },
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.trackNumber).toBe(5);
      expect(result!.discNumber).toBe(2);
    });

    it('should default discNumber to 1 when not set', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: { disk: { no: null as unknown as number, of: null as unknown as number } },
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.discNumber).toBe(1);
    });

    it('should extract BPM and initial key from ID3 tags', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({ common: { bpm: 128.7, key: 'C' } })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.bpm).toBe(129); // Math.round
      expect(result!.initialKey).toBe('C');
    });

    it('should extract technical format info', async () => {
      (parseFile as jest.Mock).mockResolvedValue(createMockMetadata());

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.sampleRate).toBe(44100);
      expect(result!.channels).toBe(2);
      expect(result!.codec).toBe('MPEG 1 Layer 3');
    });

    it('should detect cover art presence', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: {
            picture: [
              { format: 'image/jpeg', data: Buffer.from('') },
            ] as unknown as IAudioMetadata['common']['picture'],
          },
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.coverArt).toBe(true);
    });

    it('should set coverArt false when no pictures', async () => {
      (parseFile as jest.Mock).mockResolvedValue(createMockMetadata({ common: { picture: [] } }));

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.coverArt).toBe(false);
    });

    it('should extract ReplayGain values', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: {
            replaygain_track_gain: { dB: -6.5, ratio: 0.473 },
            replaygain_track_peak: { dB: 0, ratio: 0.95 },
            replaygain_album_gain: { dB: -7.2, ratio: 0.436 },
            replaygain_album_peak: { dB: 0, ratio: 0.98 },
          } as Partial<IAudioMetadata['common']>,
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.rgTrackGain).toBe(-6.5);
      expect(result!.rgTrackPeak).toBe(0.95);
      expect(result!.rgAlbumGain).toBe(-7.2);
      expect(result!.rgAlbumPeak).toBe(0.98);
    });

    it('should extract MusicBrainz IDs', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: {
            musicbrainz_recordingid: 'rec-id-123',
            musicbrainz_albumid: 'album-id-456',
            musicbrainz_artistid: ['artist-id-789'],
          } as Partial<IAudioMetadata['common']>,
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.musicBrainzTrackId).toBe('rec-id-123');
      expect(result!.musicBrainzAlbumId).toBe('album-id-456');
      expect(result!.musicBrainzArtistId).toBe('artist-id-789');
    });

    it('should handle comment as array of objects', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: {
            comment: [{ text: 'Great track' }],
          } as Partial<IAudioMetadata['common']>,
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.comment).toBe('Great track');
    });

    it('should handle comment as array of strings', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: {
            comment: ['Simple comment'],
          } as Partial<IAudioMetadata['common']>,
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.comment).toBe('Simple comment');
    });

    it('should extract lyrics text from object format', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: {
            lyrics: [{ text: 'Hello world lyrics', language: 'en', descriptor: '' }],
          } as Partial<IAudioMetadata['common']>,
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result!.lyrics).toBe('Hello world lyrics');
    });

    it('should return null when parseFile fails', async () => {
      (parseFile as jest.Mock).mockRejectedValue(new Error('Corrupt file'));

      const result = await service.extractMetadata('/music/corrupt.mp3');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle undefined/null common fields gracefully', async () => {
      (parseFile as jest.Mock).mockResolvedValue(
        createMockMetadata({
          common: {
            title: undefined,
            artist: undefined,
            album: undefined,
            year: undefined,
            genre: undefined,
            track: { no: null as unknown as number, of: null as unknown as number },
          },
          format: {
            duration: undefined,
            bitrate: undefined,
          },
        })
      );

      const result = await service.extractMetadata('/music/test.mp3');

      expect(result).not.toBeNull();
      expect(result!.title).toBeUndefined();
      expect(result!.artist).toBeUndefined();
      expect(result!.duration).toBeUndefined();
    });
  });
});
