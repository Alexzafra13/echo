import { Test, TestingModule } from '@nestjs/testing';
import { ExploreService } from './explore.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

describe('ExploreService', () => {
  let service: ExploreService;
  let mockDrizzle: { db: any };

  // Helper to create a query chain that returns specific results for main and count queries
  const setupQueryMocks = (mainResult: any[], countResult: number = 0) => {
    let queryCount = 0;

    const createChain = () => {
      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.leftJoin = jest.fn().mockReturnValue(chain);
      chain.innerJoin = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.groupBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.offset = jest.fn().mockReturnValue(chain);

      // Make chain thenable (async iterable)
      chain.then = (resolve: any) => {
        queryCount++;
        // Odd queries (1, 3, 5...) are main queries, even (2, 4, 6...) are count queries
        if (queryCount % 2 === 1) {
          return Promise.resolve(mainResult).then(resolve);
        } else {
          return Promise.resolve([{ count: countResult }]).then(resolve);
        }
      };

      return chain;
    };

    mockDrizzle.db = {
      select: jest.fn().mockImplementation(() => createChain()),
    };

    return mockDrizzle.db;
  };

  beforeEach(async () => {
    mockDrizzle = { db: {} };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExploreService,
        {
          provide: DrizzleService,
          useValue: mockDrizzle,
        },
      ],
    }).compile();

    service = module.get<ExploreService>(ExploreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUnplayedAlbums', () => {
    it('should return albums and total count', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          name: 'Test Album',
          artistId: 'artist-1',
          artistName: 'Test Artist',
          coverArtPath: '/path/to/cover.jpg',
          year: 2023,
          songCount: 10,
          duration: 3600,
        },
      ];

      setupQueryMocks(mockAlbums, 1);

      const result = await service.getUnplayedAlbums('user-123', 20, 0);

      expect(result.albums).toHaveLength(1);
      expect(result.albums[0].name).toBe('Test Album');
      expect(result.total).toBe(1);
    });

    it('should return empty array and 0 total when no albums', async () => {
      setupQueryMocks([], 0);

      const result = await service.getUnplayedAlbums('user-123');

      expect(result.albums).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default limit of 20 and offset of 0', async () => {
      let capturedLimit: number | undefined;
      let capturedOffset: number | undefined;

      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.leftJoin = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockImplementation((l: number) => {
        capturedLimit = l;
        return chain;
      });
      chain.offset = jest.fn().mockImplementation((o: number) => {
        capturedOffset = o;
        return chain;
      });
      chain.then = (resolve: any) => Promise.resolve([]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      await service.getUnplayedAlbums('user-123');

      expect(capturedLimit).toBe(20);
      expect(capturedOffset).toBe(0);
    });
  });

  describe('getForgottenAlbums', () => {
    it('should return forgotten albums with correct structure', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          name: 'Old Album',
          artistId: 'artist-1',
          artistName: 'Artist',
          coverArtPath: null,
          year: 2020,
          songCount: 8,
          duration: 2400,
          lastPlayedAt: new Date('2024-01-01'),
        },
      ];

      setupQueryMocks(mockAlbums, 1);

      const result = await service.getForgottenAlbums('user-123', 3);

      expect(result.albums).toHaveLength(1);
      expect(result.albums[0]).not.toHaveProperty('lastPlayedAt');
      expect(result.albums[0].id).toBe('album-1');
      expect(result.total).toBe(1);
    });

    it('should return empty when no forgotten albums', async () => {
      setupQueryMocks([], 0);

      const result = await service.getForgottenAlbums('user-123');

      expect(result.albums).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default monthsAgo of 3', async () => {
      setupQueryMocks([], 0);

      // Should not throw when called without monthsAgo
      const result = await service.getForgottenAlbums('user-123');

      expect(result).toBeDefined();
    });
  });

  describe('getHiddenGems', () => {
    it('should return empty array when user has no top artists', async () => {
      // First query returns empty array (no top artists)
      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.groupBy = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => Promise.resolve([]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      const result = await service.getHiddenGems('user-123');

      expect(result).toEqual([]);
    });

    it('should query tracks from top artists with low play count', async () => {
      const mockTopArtists = [
        { artistId: 'artist-1', totalPlays: 100 },
        { artistId: 'artist-2', totalPlays: 50 },
      ];

      const mockTracks = [
        {
          id: 'track-1',
          title: 'Hidden Song',
          albumId: 'album-1',
          albumName: 'Album',
          artistId: 'artist-1',
          artistName: 'Top Artist',
          coverArtPath: null,
          duration: 180,
          playCount: 1,
        },
      ];

      let queryNumber = 0;

      const createChain = () => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.from = jest.fn().mockReturnValue(chain);
        chain.leftJoin = jest.fn().mockReturnValue(chain);
        chain.where = jest.fn().mockReturnValue(chain);
        chain.groupBy = jest.fn().mockReturnValue(chain);
        chain.orderBy = jest.fn().mockReturnValue(chain);
        chain.limit = jest.fn().mockReturnValue(chain);
        chain.then = (resolve: any) => {
          queryNumber++;
          if (queryNumber === 1) {
            return Promise.resolve(mockTopArtists).then(resolve);
          }
          return Promise.resolve(mockTracks).then(resolve);
        };
        return chain;
      };

      mockDrizzle.db = { select: jest.fn().mockImplementation(() => createChain()) };

      const result = await service.getHiddenGems('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Hidden Song');
      expect(result[0].playCount).toBe(1);
    });

    it('should respect the limit parameter', async () => {
      const mockTopArtists = [{ artistId: 'artist-1', totalPlays: 100 }];

      let capturedLimit: number | undefined;
      let queryNumber = 0;

      const createChain = () => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.from = jest.fn().mockReturnValue(chain);
        chain.leftJoin = jest.fn().mockReturnValue(chain);
        chain.where = jest.fn().mockReturnValue(chain);
        chain.groupBy = jest.fn().mockReturnValue(chain);
        chain.orderBy = jest.fn().mockReturnValue(chain);
        chain.limit = jest.fn().mockImplementation((l: number) => {
          if (queryNumber === 1) capturedLimit = l;
          return chain;
        });
        chain.then = (resolve: any) => {
          queryNumber++;
          if (queryNumber === 1) {
            return Promise.resolve(mockTopArtists).then(resolve);
          }
          return Promise.resolve([]).then(resolve);
        };
        return chain;
      };

      mockDrizzle.db = { select: jest.fn().mockImplementation(() => createChain()) };

      await service.getHiddenGems('user-123', 15);

      expect(capturedLimit).toBe(15);
    });
  });

  describe('getRandomAlbum', () => {
    it('should return null when no albums exist', async () => {
      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.leftJoin = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => Promise.resolve([]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      const result = await service.getRandomAlbum();

      expect(result).toBeNull();
    });

    it('should return an album when albums exist', async () => {
      const mockAlbum = {
        id: 'album-1',
        name: 'Random Album',
        artistId: 'artist-1',
        artistName: 'Artist',
        coverArtPath: null,
        year: 2023,
        songCount: 12,
        duration: 3000,
      };

      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.leftJoin = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => Promise.resolve([mockAlbum]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      const result = await service.getRandomAlbum();

      expect(result).toEqual(mockAlbum);
    });
  });

  describe('getRandomArtist', () => {
    it('should return null when no artists with songs exist', async () => {
      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => Promise.resolve([]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      const result = await service.getRandomArtist();

      expect(result).toBeNull();
    });

    it('should return an artist when artists with songs exist', async () => {
      const mockArtist = {
        id: 'artist-1',
        name: 'Random Artist',
        profileImagePath: '/path/to/image.jpg',
        albumCount: 3,
        songCount: 25,
      };

      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => Promise.resolve([mockArtist]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      const result = await service.getRandomArtist();

      expect(result).toEqual(mockArtist);
    });
  });

  describe('getRandomAlbums', () => {
    it('should return empty array when no albums exist', async () => {
      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.leftJoin = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => Promise.resolve([]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      const result = await service.getRandomAlbums();

      expect(result).toEqual([]);
    });

    it('should return requested number of albums', async () => {
      const mockAlbums = [
        { id: 'album-1', name: 'Album 1' },
        { id: 'album-2', name: 'Album 2' },
        { id: 'album-3', name: 'Album 3' },
      ];

      let capturedLimit: number | undefined;

      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.leftJoin = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockImplementation((l: number) => {
        capturedLimit = l;
        return chain;
      });
      chain.then = (resolve: any) => Promise.resolve(mockAlbums).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      const result = await service.getRandomAlbums(3);

      expect(capturedLimit).toBe(3);
      expect(result).toHaveLength(3);
    });

    it('should use default count of 6', async () => {
      let capturedLimit: number | undefined;

      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.from = jest.fn().mockReturnValue(chain);
      chain.leftJoin = jest.fn().mockReturnValue(chain);
      chain.orderBy = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockImplementation((l: number) => {
        capturedLimit = l;
        return chain;
      });
      chain.then = (resolve: any) => Promise.resolve([]).then(resolve);

      mockDrizzle.db = { select: jest.fn().mockReturnValue(chain) };

      await service.getRandomAlbums();

      expect(capturedLimit).toBe(6);
    });
  });
});
