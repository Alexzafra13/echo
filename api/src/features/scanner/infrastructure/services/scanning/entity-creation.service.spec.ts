import { EntityCreationService } from './entity-creation.service';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { CoverArtService } from '@shared/services';
import { PinoLogger } from 'nestjs-pino';

describe('EntityCreationService', () => {
  let service: EntityCreationService;
  let mockDrizzle: { db: { select: jest.Mock; insert: jest.Mock; update: jest.Mock } };
  let mockCoverArtService: Record<string, unknown>;
  let mockLogger: ReturnType<typeof createMockPinoLogger>;

  const createSelectChain = (result: unknown[] = []) => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  });

  const createInsertChain = (result: unknown[] = []) => ({
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  });

  const createUpdateChain = () => ({
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    mockLogger = createMockPinoLogger();
    mockCoverArtService = {};

    mockDrizzle = {
      db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new EntityCreationService(
      mockDrizzle as unknown as DrizzleService,
      mockCoverArtService as unknown as CoverArtService,
      mockLogger as unknown as PinoLogger
    );
  });

  describe('clearCache', () => {
    it('should clear artist and album caches', async () => {
      // Populate cache via findOrCreateArtist
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([{ id: 'artist-1', name: 'Artist', mbzArtistId: null }])
      );
      await service.findOrCreateArtist('Artist');

      // Verify cached (no new DB call)
      mockDrizzle.db.select.mockClear();
      await service.findOrCreateArtist('Artist');
      expect(mockDrizzle.db.select).not.toHaveBeenCalled();

      // Clear cache
      service.clearCache();

      // Now should query DB again
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([{ id: 'artist-1', name: 'Artist', mbzArtistId: null }])
      );
      await service.findOrCreateArtist('Artist');
      expect(mockDrizzle.db.select).toHaveBeenCalled();
    });
  });

  describe('findOrCreateArtist', () => {
    it('should return existing artist from DB and cache it', async () => {
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([{ id: 'artist-1', name: 'Test Artist', mbzArtistId: null }])
      );

      const result = await service.findOrCreateArtist('Test Artist');

      expect(result.id).toBe('artist-1');
      expect(result.name).toBe('Test Artist');
      expect(result.created).toBe(false);
    });

    it('should return cached artist on subsequent calls', async () => {
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([{ id: 'artist-1', name: 'Cached Artist', mbzArtistId: null }])
      );

      // First call
      await service.findOrCreateArtist('Cached Artist');

      // Reset mock to verify no new call
      mockDrizzle.db.select.mockClear();

      // Second call should use cache
      const result = await service.findOrCreateArtist('Cached Artist');

      expect(result.id).toBe('artist-1');
      expect(mockDrizzle.db.select).not.toHaveBeenCalled();
    });

    it('should create new artist when not found', async () => {
      // Not found in DB
      mockDrizzle.db.select.mockReturnValue(createSelectChain([]));

      // Insert returns new artist
      mockDrizzle.db.insert.mockReturnValue(
        createInsertChain([{ id: 'new-artist-id', name: 'New Artist' }])
      );

      const result = await service.findOrCreateArtist('New Artist');

      expect(result.created).toBe(true);
      expect(result.name).toBe('New Artist');
      expect(mockDrizzle.db.insert).toHaveBeenCalled();
    });

    it('should use "Unknown Artist" when name is empty', async () => {
      mockDrizzle.db.select.mockReturnValue(createSelectChain([]));
      mockDrizzle.db.insert.mockReturnValue(
        createInsertChain([{ id: 'unknown-id', name: 'Unknown Artist' }])
      );

      const result = await service.findOrCreateArtist('');

      expect(result.name).toBe('Unknown Artist');
    });

    it('should update MBID when artist exists without one', async () => {
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([{ id: 'artist-1', name: 'Artist', mbzArtistId: null }])
      );
      mockDrizzle.db.update.mockReturnValue(createUpdateChain());

      await service.findOrCreateArtist('Artist', 'mbz-123');

      expect(mockDrizzle.db.update).toHaveBeenCalled();
    });

    it('should NOT update MBID when artist already has one', async () => {
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([{ id: 'artist-1', name: 'Artist', mbzArtistId: 'existing-mbz' }])
      );

      await service.findOrCreateArtist('Artist', 'new-mbz');

      expect(mockDrizzle.db.update).not.toHaveBeenCalled();
    });
  });
});
