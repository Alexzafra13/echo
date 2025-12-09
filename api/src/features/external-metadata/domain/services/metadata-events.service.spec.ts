import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import {
  MetadataEventsService,
  MetadataEventType,
  ArtistImagesUpdatedPayload,
  AlbumCoverUpdatedPayload,
  EnrichmentStartedPayload,
  EnrichmentCompletedPayload,
  EnrichmentErrorPayload,
  QueueStartedPayload,
  QueueItemCompletedPayload,
  QueueCompletedPayload,
} from './metadata-events.service';

describe('MetadataEventsService', () => {
  let service: MetadataEventsService;
  let mockLogger: { debug: jest.Mock };

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataEventsService,
        {
          provide: getLoggerToken(MetadataEventsService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<MetadataEventsService>(MetadataEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('emit', () => {
    it('should emit events with timestamp', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: ArtistImagesUpdatedPayload = {
        artistId: 'artist-123',
        artistName: 'Test Artist',
        imageType: 'profile',
        updatedAt: new Date(),
      };

      service.emitArtistImagesUpdated(payload);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'artist:images:updated',
          data: expect.objectContaining({
            artistId: 'artist-123',
            artistName: 'Test Artist',
            imageType: 'profile',
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should log debug message when emitting', () => {
      service.emitArtistImagesUpdated({
        artistId: 'artist-123',
        artistName: 'Test Artist',
        imageType: 'profile',
        updatedAt: new Date(),
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'artist:images:updated',
        }),
        'Emitting metadata event',
      );
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should receive events after subscribing', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitArtistImagesUpdated({
        artistId: 'artist-123',
        artistName: 'Test Artist',
        imageType: 'profile',
        updatedAt: new Date(),
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not receive events after unsubscribing', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe(callback);

      unsubscribe();

      service.emitArtistImagesUpdated({
        artistId: 'artist-123',
        artistName: 'Test Artist',
        imageType: 'profile',
        updatedAt: new Date(),
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.subscribe(callback1);
      service.subscribe(callback2);

      service.emitArtistImagesUpdated({
        artistId: 'artist-123',
        artistName: 'Test Artist',
        imageType: 'profile',
        updatedAt: new Date(),
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('emitArtistImagesUpdated', () => {
    it('should emit artist:images:updated event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: ArtistImagesUpdatedPayload = {
        artistId: 'artist-123',
        artistName: 'Pink Floyd',
        imageType: 'background',
        updatedAt: new Date('2024-01-15'),
      };

      service.emitArtistImagesUpdated(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'artist:images:updated',
          data: expect.objectContaining({
            artistId: 'artist-123',
            artistName: 'Pink Floyd',
            imageType: 'background',
          }),
        }),
      );
    });
  });

  describe('emitAlbumCoverUpdated', () => {
    it('should emit album:cover:updated event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: AlbumCoverUpdatedPayload = {
        albumId: 'album-456',
        albumName: 'Dark Side of the Moon',
        artistId: 'artist-123',
        updatedAt: new Date('2024-01-15'),
      };

      service.emitAlbumCoverUpdated(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'album:cover:updated',
          data: expect.objectContaining({
            albumId: 'album-456',
            albumName: 'Dark Side of the Moon',
            artistId: 'artist-123',
          }),
        }),
      );
    });
  });

  describe('emitCacheInvalidation', () => {
    it('should emit metadata:cache:invalidate event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitCacheInvalidation({
        entityType: 'artist',
        entityId: 'artist-123',
        reason: 'Manual refresh',
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'metadata:cache:invalidate',
          data: expect.objectContaining({
            entityType: 'artist',
            entityId: 'artist-123',
            reason: 'Manual refresh',
          }),
        }),
      );
    });
  });

  describe('enrichment events', () => {
    it('should emit enrichment:started event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: EnrichmentStartedPayload = {
        entityType: 'artist',
        entityId: 'artist-123',
        entityName: 'Pink Floyd',
        total: 2,
      };

      service.emitEnrichmentStarted(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'enrichment:started',
          data: expect.objectContaining({
            entityType: 'artist',
            entityId: 'artist-123',
            total: 2,
          }),
        }),
      );
    });

    it('should emit enrichment:progress event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitEnrichmentProgress({
        entityType: 'artist',
        entityId: 'artist-123',
        entityName: 'Pink Floyd',
        current: 1,
        total: 2,
        step: 'Fetching biography',
        details: 'From Last.fm',
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'enrichment:progress',
          data: expect.objectContaining({
            current: 1,
            total: 2,
            step: 'Fetching biography',
          }),
        }),
      );
    });

    it('should emit enrichment:completed event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: EnrichmentCompletedPayload = {
        entityType: 'artist',
        entityId: 'artist-123',
        entityName: 'Pink Floyd',
        bioUpdated: true,
        imagesUpdated: true,
        duration: 1500,
      };

      service.emitEnrichmentCompleted(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'enrichment:completed',
          data: expect.objectContaining({
            bioUpdated: true,
            imagesUpdated: true,
            duration: 1500,
          }),
        }),
      );
    });

    it('should emit enrichment:error event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: EnrichmentErrorPayload = {
        entityType: 'album',
        entityId: 'album-456',
        entityName: 'Dark Side of the Moon',
        error: 'Cover Art Archive unavailable',
      };

      service.emitEnrichmentError(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'enrichment:error',
          data: expect.objectContaining({
            entityType: 'album',
            error: 'Cover Art Archive unavailable',
          }),
        }),
      );
    });
  });

  describe('batch enrichment events', () => {
    it('should emit batch:enrichment:started event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitBatchEnrichmentStarted({
        entityType: 'artist',
        total: 100,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'batch:enrichment:started',
          data: expect.objectContaining({
            entityType: 'artist',
            total: 100,
          }),
        }),
      );
    });

    it('should emit batch:enrichment:progress event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitBatchEnrichmentProgress({
        entityType: 'artist',
        current: 50,
        total: 100,
        currentEntity: 'Pink Floyd',
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'batch:enrichment:progress',
          data: expect.objectContaining({
            current: 50,
            total: 100,
            currentEntity: 'Pink Floyd',
          }),
        }),
      );
    });

    it('should emit batch:enrichment:completed event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitBatchEnrichmentCompleted({
        entityType: 'artist',
        total: 100,
        successful: 95,
        failed: 5,
        duration: 300000,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'batch:enrichment:completed',
          data: expect.objectContaining({
            successful: 95,
            failed: 5,
          }),
        }),
      );
    });
  });

  describe('queue events', () => {
    it('should emit queue:started event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: QueueStartedPayload = {
        totalPending: 150,
        pendingArtists: 50,
        pendingAlbums: 100,
      };

      service.emitQueueStarted(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue:started',
          data: expect.objectContaining({
            totalPending: 150,
            pendingArtists: 50,
            pendingAlbums: 100,
          }),
        }),
      );
    });

    it('should emit queue:stopped event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitQueueStopped({
        processedInSession: 25,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue:stopped',
          data: expect.objectContaining({
            processedInSession: 25,
          }),
        }),
      );
    });

    it('should emit queue:item:completed event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: QueueItemCompletedPayload = {
        itemType: 'artist',
        entityName: 'Pink Floyd',
        processedInSession: 10,
        totalPending: 140,
        estimatedTimeRemaining: '1h 30m',
      };

      service.emitQueueItemCompleted(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue:item:completed',
          data: expect.objectContaining({
            itemType: 'artist',
            entityName: 'Pink Floyd',
            estimatedTimeRemaining: '1h 30m',
          }),
        }),
      );
    });

    it('should emit queue:item:error event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      service.emitQueueItemError({
        itemType: 'album',
        entityName: 'Dark Side of the Moon',
        error: 'Rate limited',
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue:item:error',
          data: expect.objectContaining({
            itemType: 'album',
            error: 'Rate limited',
          }),
        }),
      );
    });

    it('should emit queue:completed event', () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const payload: QueueCompletedPayload = {
        processedInSession: 150,
        duration: '2h 15m',
      };

      service.emitQueueCompleted(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue:completed',
          data: expect.objectContaining({
            processedInSession: 150,
            duration: '2h 15m',
          }),
        }),
      );
    });
  });

  describe('getEmitter', () => {
    it('should return the internal EventEmitter', () => {
      const emitter = service.getEmitter();
      expect(emitter).toBeDefined();
      expect(typeof emitter.on).toBe('function');
      expect(typeof emitter.emit).toBe('function');
    });
  });
});
