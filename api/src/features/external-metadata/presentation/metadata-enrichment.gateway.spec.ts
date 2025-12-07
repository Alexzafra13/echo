import { MetadataEnrichmentGateway } from './metadata-enrichment.gateway';

describe('MetadataEnrichmentGateway', () => {
  let gateway: MetadataEnrichmentGateway;
  let mockServer: any;

  beforeEach(() => {
    gateway = new MetadataEnrichmentGateway();

    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    gateway.server = mockServer;
  });

  describe('lifecycle hooks', () => {
    it('should log on init', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.afterInit(mockServer);

      expect(logSpy).toHaveBeenCalled();
    });

    it('should log on client connect', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      const mockClient = { id: 'client-123' };

      gateway.handleConnection(mockClient as any);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('client-123'),
      );
    });

    it('should log on client disconnect', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      const mockClient = { id: 'client-456' };

      gateway.handleDisconnect(mockClient as any);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('client-456'),
      );
    });
  });

  describe('emitEnrichmentStarted', () => {
    it('should emit enrichment:started event with data', () => {
      const data = {
        entityType: 'artist' as const,
        entityId: 'artist-123',
        entityName: 'The Beatles',
        total: 5,
      };

      gateway.emitEnrichmentStarted(data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'enrichment:started',
        expect.objectContaining({
          entityType: 'artist',
          entityId: 'artist-123',
          entityName: 'The Beatles',
          total: 5,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should emit for album entity type', () => {
      const data = {
        entityType: 'album' as const,
        entityId: 'album-456',
        entityName: 'Abbey Road',
        total: 3,
      };

      gateway.emitEnrichmentStarted(data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'enrichment:started',
        expect.objectContaining({ entityType: 'album' }),
      );
    });
  });

  describe('emitEnrichmentProgress', () => {
    it('should emit progress with percentage calculation', () => {
      const data = {
        entityType: 'artist' as const,
        entityId: 'artist-123',
        entityName: 'Queen',
        current: 3,
        total: 10,
        step: 'Fetching biography',
      };

      gateway.emitEnrichmentProgress(data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'enrichment:progress',
        expect.objectContaining({
          current: 3,
          total: 10,
          percentage: 30,
          step: 'Fetching biography',
        }),
      );
    });

    it('should round percentage to nearest integer', () => {
      const data = {
        entityType: 'album' as const,
        entityId: 'album-1',
        entityName: 'Test Album',
        current: 1,
        total: 3,
        step: 'Processing',
      };

      gateway.emitEnrichmentProgress(data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'enrichment:progress',
        expect.objectContaining({ percentage: 33 }), // 33.33... rounded
      );
    });

    it('should include optional details when provided', () => {
      const data = {
        entityType: 'artist' as const,
        entityId: 'artist-1',
        entityName: 'Pink Floyd',
        current: 2,
        total: 4,
        step: 'Downloading images',
        details: 'Found 3 images on Spotify',
      };

      gateway.emitEnrichmentProgress(data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'enrichment:progress',
        expect.objectContaining({ details: 'Found 3 images on Spotify' }),
      );
    });
  });

  describe('emitEnrichmentCompleted', () => {
    it('should emit completed event with all flags', () => {
      const data = {
        entityType: 'artist' as const,
        entityId: 'artist-123',
        entityName: 'Led Zeppelin',
        bioUpdated: true,
        imagesUpdated: true,
        coverUpdated: false,
        duration: 1500,
      };

      gateway.emitEnrichmentCompleted(data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'enrichment:completed',
        expect.objectContaining({
          entityName: 'Led Zeppelin',
          bioUpdated: true,
          imagesUpdated: true,
          coverUpdated: false,
          duration: 1500,
        }),
      );
    });
  });

  describe('emitEnrichmentError', () => {
    it('should emit error event', () => {
      const data = {
        entityType: 'album' as const,
        entityId: 'album-999',
        entityName: 'Unknown Album',
        error: 'API rate limit exceeded',
      };

      gateway.emitEnrichmentError(data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'enrichment:error',
        expect.objectContaining({
          entityName: 'Unknown Album',
          error: 'API rate limit exceeded',
        }),
      );
    });
  });

  describe('batch enrichment events', () => {
    it('should emit batch:enrichment:started', () => {
      gateway.emitBatchEnrichmentStarted({
        entityType: 'artist',
        total: 50,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'batch:enrichment:started',
        expect.objectContaining({ entityType: 'artist', total: 50 }),
      );
    });

    it('should emit batch:enrichment:progress with percentage', () => {
      gateway.emitBatchEnrichmentProgress({
        entityType: 'album',
        current: 25,
        total: 100,
        currentEntity: 'Abbey Road',
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'batch:enrichment:progress',
        expect.objectContaining({
          current: 25,
          total: 100,
          percentage: 25,
          currentEntity: 'Abbey Road',
        }),
      );
    });

    it('should emit batch:enrichment:completed', () => {
      gateway.emitBatchEnrichmentCompleted({
        entityType: 'artist',
        total: 50,
        successful: 48,
        failed: 2,
        duration: 120000,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'batch:enrichment:completed',
        expect.objectContaining({
          total: 50,
          successful: 48,
          failed: 2,
          duration: 120000,
        }),
      );
    });
  });

  describe('emitArtistImagesUpdated', () => {
    it('should emit to all clients and artist room', () => {
      const data = {
        artistId: 'artist-123',
        artistName: 'David Bowie',
        imageType: 'profile' as const,
        updatedAt: new Date('2024-01-15'),
      };

      gateway.emitArtistImagesUpdated(data);

      // Emitted to all
      expect(mockServer.emit).toHaveBeenCalledWith(
        'artist:images:updated',
        expect.objectContaining({ artistId: 'artist-123' }),
      );

      // Emitted to room
      expect(mockServer.to).toHaveBeenCalledWith('artist:artist-123');
    });

    it('should support all image types', () => {
      const imageTypes = ['profile', 'background', 'banner', 'logo'] as const;

      imageTypes.forEach((imageType) => {
        gateway.emitArtistImagesUpdated({
          artistId: 'artist-1',
          artistName: 'Test Artist',
          imageType,
          updatedAt: new Date(),
        });
      });

      // Each call emits twice: once to all (server.emit) and once to room (to().emit())
      // 4 image types * 2 emits = 8 total
      expect(mockServer.emit).toHaveBeenCalledTimes(8);
    });
  });

  describe('emitAlbumCoverUpdated', () => {
    it('should emit to all clients, album room, and artist room', () => {
      const data = {
        albumId: 'album-456',
        albumName: 'The Dark Side of the Moon',
        artistId: 'artist-789',
        updatedAt: new Date('2024-01-15'),
      };

      gateway.emitAlbumCoverUpdated(data);

      // Emitted to all
      expect(mockServer.emit).toHaveBeenCalledWith(
        'album:cover:updated',
        expect.objectContaining({ albumId: 'album-456' }),
      );

      // Emitted to album room
      expect(mockServer.to).toHaveBeenCalledWith('album:album-456');

      // Emitted to artist room
      expect(mockServer.to).toHaveBeenCalledWith('artist:artist-789');
    });
  });

  describe('emitCacheInvalidation', () => {
    it('should emit cache invalidation event', () => {
      gateway.emitCacheInvalidation({
        entityType: 'artist',
        entityId: 'artist-123',
        reason: 'Manual image update',
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'metadata:cache:invalidate',
        expect.objectContaining({
          entityType: 'artist',
          entityId: 'artist-123',
          reason: 'Manual image update',
        }),
      );
    });
  });

  describe('queue events', () => {
    it('should emit queue:started', () => {
      gateway.emitQueueStarted({
        totalPending: 100,
        pendingArtists: 60,
        pendingAlbums: 40,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'queue:started',
        expect.objectContaining({
          totalPending: 100,
          pendingArtists: 60,
          pendingAlbums: 40,
        }),
      );
    });

    it('should emit queue:stopped', () => {
      gateway.emitQueueStopped({ processedInSession: 25 });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'queue:stopped',
        expect.objectContaining({ processedInSession: 25 }),
      );
    });

    it('should emit queue:item:completed', () => {
      gateway.emitQueueItemCompleted({
        itemType: 'artist',
        entityName: 'Queen',
        processedInSession: 10,
        totalPending: 90,
        estimatedTimeRemaining: '15 minutes',
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'queue:item:completed',
        expect.objectContaining({
          itemType: 'artist',
          entityName: 'Queen',
          estimatedTimeRemaining: '15 minutes',
        }),
      );
    });

    it('should emit queue:item:error', () => {
      gateway.emitQueueItemError({
        itemType: 'album',
        entityName: 'Unknown Album',
        error: 'Network timeout',
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'queue:item:error',
        expect.objectContaining({
          itemType: 'album',
          error: 'Network timeout',
        }),
      );
    });

    it('should emit queue:completed', () => {
      gateway.emitQueueCompleted({
        processedInSession: 100,
        duration: '2 hours 30 minutes',
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'queue:completed',
        expect.objectContaining({
          processedInSession: 100,
          duration: '2 hours 30 minutes',
        }),
      );
    });
  });

  describe('timestamp generation', () => {
    it('should add ISO timestamp to all events', () => {
      const beforeTime = new Date().toISOString();

      gateway.emitEnrichmentStarted({
        entityType: 'artist',
        entityId: '1',
        entityName: 'Test',
        total: 1,
      });

      const afterTime = new Date().toISOString();
      const emittedData = mockServer.emit.mock.calls[0][1];

      expect(emittedData.timestamp).toBeDefined();
      expect(emittedData.timestamp >= beforeTime).toBe(true);
      expect(emittedData.timestamp <= afterTime).toBe(true);
    });
  });
});
