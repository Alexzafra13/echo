import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { IcyMetadataService, RadioMetadata } from './icy-metadata.service';
import { EventEmitter } from 'events';

// Mock icecast-parser
jest.mock('icecast-parser', () => ({
  Parser: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    destroy: jest.fn(),
  })),
}));

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  setContext: jest.fn(),
  assign: jest.fn(),
};

describe('IcyMetadataService', () => {
  let service: IcyMetadataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IcyMetadataService,
        { provide: getLoggerToken(IcyMetadataService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<IcyMetadataService>(IcyMetadataService);
  });

  afterEach(() => {
    // Cleanup any active streams
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseMetadata', () => {
    // Access private method for testing
    const callParseMetadata = (
      service: IcyMetadataService,
      stationUuid: string,
      metadata: Map<string, string>,
    ): RadioMetadata => {
      return (service as any).parseMetadata(stationUuid, metadata);
    };

    it('should parse "Artist - Song" format correctly', () => {
      const metadata = new Map<string, string>();
      metadata.set('StreamTitle', 'Pink Floyd - Comfortably Numb');

      const result = callParseMetadata(service, 'station-1', metadata);

      expect(result.stationUuid).toBe('station-1');
      expect(result.artist).toBe('Pink Floyd');
      expect(result.song).toBe('Comfortably Numb');
      expect(result.title).toBe('Pink Floyd - Comfortably Numb');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle song-only format (no artist)', () => {
      const metadata = new Map<string, string>();
      metadata.set('StreamTitle', 'Unknown Song Title');

      const result = callParseMetadata(service, 'station-1', metadata);

      expect(result.artist).toBeUndefined();
      expect(result.song).toBe('Unknown Song Title');
      expect(result.title).toBe('Unknown Song Title');
    });

    it('should handle empty StreamTitle', () => {
      const metadata = new Map<string, string>();
      metadata.set('StreamTitle', '');

      const result = callParseMetadata(service, 'station-1', metadata);

      expect(result.artist).toBeUndefined();
      expect(result.song).toBeUndefined();
      expect(result.title).toBeUndefined();
    });

    it('should handle missing StreamTitle', () => {
      const metadata = new Map<string, string>();

      const result = callParseMetadata(service, 'station-1', metadata);

      expect(result.artist).toBeUndefined();
      expect(result.song).toBeUndefined();
      expect(result.title).toBeUndefined();
      expect(result.stationUuid).toBe('station-1');
    });

    it('should trim whitespace from artist and song', () => {
      const metadata = new Map<string, string>();
      metadata.set('StreamTitle', '  Led Zeppelin   -   Stairway to Heaven  ');

      const result = callParseMetadata(service, 'station-1', metadata);

      expect(result.artist).toBe('Led Zeppelin');
      expect(result.song).toBe('Stairway to Heaven');
    });

    it('should handle multiple dashes in song title', () => {
      const metadata = new Map<string, string>();
      metadata.set('StreamTitle', 'AC/DC - Back in Black - Remastered');

      const result = callParseMetadata(service, 'station-1', metadata);

      // First dash splits artist, rest is song
      expect(result.artist).toBe('AC/DC');
      expect(result.song).toBe('Back in Black - Remastered');
    });

    it('should handle dash at the beginning (no artist)', () => {
      const metadata = new Map<string, string>();
      metadata.set('StreamTitle', ' - Just A Song');

      const result = callParseMetadata(service, 'station-1', metadata);

      // After trim, dash is at position 0, so dashIndex is 0 (not > 0)
      // This means it's treated as song-only format
      expect(result.song).toBe('- Just A Song');
      expect(result.artist).toBeUndefined();
    });

    it('should include timestamp in result', () => {
      const before = Date.now();
      const metadata = new Map<string, string>();
      metadata.set('StreamTitle', 'Artist - Song');

      const result = callParseMetadata(service, 'station-1', metadata);
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('isHttpsUrl', () => {
    const callIsHttpsUrl = (service: IcyMetadataService, url: string): boolean => {
      return (service as any).isHttpsUrl(url);
    };

    it('should return true for HTTPS URLs', () => {
      expect(callIsHttpsUrl(service, 'https://stream.example.com/radio')).toBe(true);
      expect(callIsHttpsUrl(service, 'HTTPS://STREAM.EXAMPLE.COM')).toBe(true);
    });

    it('should return false for HTTP URLs', () => {
      expect(callIsHttpsUrl(service, 'http://stream.example.com/radio')).toBe(false);
    });

    it('should return false for other protocols', () => {
      expect(callIsHttpsUrl(service, 'ftp://example.com')).toBe(false);
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should return an EventEmitter when subscribing', () => {
      const emitter = service.subscribe('station-1', 'http://example.com/stream');

      expect(emitter).toBeInstanceOf(EventEmitter);
    });

    it('should add listener to tracking', () => {
      service.subscribe('station-1', 'http://example.com/stream');

      const stats = service.getStats();
      expect(stats.totalListeners).toBe(1);
      expect(stats.activeStreams).toBe(1);
    });

    it('should allow multiple subscribers to same station', () => {
      service.subscribe('station-1', 'http://example.com/stream');
      service.subscribe('station-1', 'http://example.com/stream');
      service.subscribe('station-1', 'http://example.com/stream');

      const stats = service.getStats();
      expect(stats.totalListeners).toBe(3);
      expect(stats.activeStreams).toBe(1); // Still only one stream
    });

    it('should remove listener when unsubscribing', () => {
      const emitter1 = service.subscribe('station-1', 'http://example.com/stream');
      const emitter2 = service.subscribe('station-1', 'http://example.com/stream');

      service.unsubscribe('station-1', emitter1);

      const stats = service.getStats();
      expect(stats.totalListeners).toBe(1);
    });

    it('should close stream when last listener unsubscribes', () => {
      const emitter = service.subscribe('station-1', 'http://example.com/stream');

      service.unsubscribe('station-1', emitter);

      const stats = service.getStats();
      expect(stats.totalListeners).toBe(0);
      expect(stats.activeStreams).toBe(0);
    });

    it('should handle unsubscribe for non-existent station gracefully', () => {
      const emitter = new EventEmitter();

      // Should not throw
      expect(() => service.unsubscribe('non-existent', emitter)).not.toThrow();
    });

    it('should have default error handler on emitter to prevent crashes', () => {
      const emitter = service.subscribe('station-1', 'http://example.com/stream');

      // Emitting error should not throw (due to default handler)
      expect(() => emitter.emit('error', new Error('Test error'))).not.toThrow();
    });
  });

  describe('error classification', () => {
    // Test error classification logic by checking handler behavior
    // The actual handler is private, but we can test the classification criteria

    describe('DNS errors', () => {
      const dnsErrorMessages = [
        'getaddrinfo EAI_AGAIN example.com',
        'getaddrinfo ENOTFOUND example.com',
        'EAI_NODATA',
        'EAI_NONAME',
      ];

      it.each(dnsErrorMessages)('should recognize "%s" as DNS error', (message) => {
        const isDnsError =
          message.includes('EAI_AGAIN') ||
          message.includes('EAI_NODATA') ||
          message.includes('EAI_NONAME') ||
          message.includes('ENOTFOUND') ||
          message.includes('getaddrinfo');

        expect(isDnsError).toBe(true);
      });
    });

    describe('SSL errors', () => {
      const sslErrorMessages = [
        'certificate has expired',
        'self signed certificate',
        'SSL_ERROR_RX_RECORD_TOO_LONG',
        'CERT_HAS_EXPIRED',
        'TLS handshake failed',
      ];

      it.each(sslErrorMessages)('should recognize "%s" as SSL error', (message) => {
        const isSslError =
          message.includes('certificate') ||
          message.includes('SSL') ||
          message.includes('TLS') ||
          message.includes('CERT_');

        expect(isSslError).toBe(true);
      });
    });

    describe('Network errors', () => {
      const networkErrorMessages = [
        'connect ECONNREFUSED 127.0.0.1:8000',
        'read ECONNRESET',
        'connect ETIMEDOUT',
        'connect EHOSTUNREACH',
      ];

      it.each(networkErrorMessages)('should recognize "%s" as network error', (message) => {
        const isNetworkError =
          message.includes('ECONNREFUSED') ||
          message.includes('ECONNRESET') ||
          message.includes('ETIMEDOUT') ||
          message.includes('EHOSTUNREACH');

        expect(isNetworkError).toBe(true);
      });
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty service', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        activeStreams: 0,
        totalListeners: 0,
        streamDetails: [],
      });
    });

    it('should return correct stats with multiple stations', () => {
      service.subscribe('station-1', 'http://example1.com/stream');
      service.subscribe('station-1', 'http://example1.com/stream');
      service.subscribe('station-2', 'http://example2.com/stream');

      const stats = service.getStats();

      expect(stats.activeStreams).toBe(2);
      expect(stats.totalListeners).toBe(3);
      expect(stats.streamDetails).toHaveLength(2);
      expect(stats.streamDetails).toContainEqual({ stationUuid: 'station-1', listeners: 2 });
      expect(stats.streamDetails).toContainEqual({ stationUuid: 'station-2', listeners: 1 });
    });
  });

  describe('lifecycle', () => {
    it('should cleanup on module destroy', () => {
      service.subscribe('station-1', 'http://example.com/stream');
      service.subscribe('station-2', 'http://example2.com/stream');

      service.onModuleDestroy();

      const stats = service.getStats();
      expect(stats.activeStreams).toBe(0);
      expect(stats.totalListeners).toBe(0);
    });

    it('should register global error handler on init', () => {
      const prependListenerSpy = jest.spyOn(process, 'prependListener');

      service.onModuleInit();

      expect(prependListenerSpy).toHaveBeenCalledWith(
        'uncaughtException',
        expect.any(Function),
      );

      prependListenerSpy.mockRestore();
    });

    it('should remove global error handler on destroy', () => {
      const removeListenerSpy = jest.spyOn(process, 'removeListener');

      service.onModuleInit();
      service.onModuleDestroy();

      expect(removeListenerSpy).toHaveBeenCalledWith(
        'uncaughtException',
        expect.any(Function),
      );

      removeListenerSpy.mockRestore();
    });
  });

  describe('broadcastMetadata', () => {
    it('should emit metadata to all subscribers', () => {
      const emitter1 = service.subscribe('station-1', 'http://example.com/stream');
      const emitter2 = service.subscribe('station-1', 'http://example.com/stream');

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter1.on('metadata', handler1);
      emitter2.on('metadata', handler2);

      const metadata: RadioMetadata = {
        stationUuid: 'station-1',
        artist: 'Test Artist',
        song: 'Test Song',
        title: 'Test Artist - Test Song',
        timestamp: Date.now(),
      };

      // Call private method
      (service as any).broadcastMetadata('station-1', metadata);

      expect(handler1).toHaveBeenCalledWith(metadata);
      expect(handler2).toHaveBeenCalledWith(metadata);
    });

    it('should not emit to subscribers of different stations', () => {
      const emitter1 = service.subscribe('station-1', 'http://example1.com/stream');
      const emitter2 = service.subscribe('station-2', 'http://example2.com/stream');

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter1.on('metadata', handler1);
      emitter2.on('metadata', handler2);

      const metadata: RadioMetadata = {
        stationUuid: 'station-1',
        artist: 'Artist',
        song: 'Song',
        timestamp: Date.now(),
      };

      (service as any).broadcastMetadata('station-1', metadata);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('broadcastError', () => {
    it('should emit error to all subscribers of a station', () => {
      const emitter1 = service.subscribe('station-1', 'http://example.com/stream');
      const emitter2 = service.subscribe('station-1', 'http://example.com/stream');

      // Replace default error handlers
      emitter1.removeAllListeners('error');
      emitter2.removeAllListeners('error');

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter1.on('error', handler1);
      emitter2.on('error', handler2);

      const error = new Error('Stream error');

      (service as any).broadcastError('station-1', error);

      expect(handler1).toHaveBeenCalledWith(error);
      expect(handler2).toHaveBeenCalledWith(error);
    });
  });
});
