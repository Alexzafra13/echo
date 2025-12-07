import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case';

describe('GetDashboardStatsUseCase', () => {
  let useCase: GetDashboardStatsUseCase;
  let mockDrizzle: any;
  let mockHealthCheck: any;
  let mockSettingsService: any;
  let mockCache: any;

  // Full cached response to avoid complex Drizzle mocking
  const fullCachedResponse = {
    'dashboard:library-stats': {
      totalTracks: 1000,
      totalAlbums: 100,
      totalArtists: 50,
      totalGenres: 20,
      totalDuration: 360000,
      totalStorage: 5000000000,
      tracksAddedToday: 5,
      albumsAddedToday: 1,
      artistsAddedToday: 1,
    },
    'dashboard:storage-breakdown': {
      music: 4000000000,
      metadata: 500000000,
      avatars: 10000000,
      total: 4510000000,
    },
    'dashboard:enrichment-stats': {
      today: { total: 10, successful: 8, failed: 2, byProvider: { lastfm: 5, fanart: 3 } },
      week: { total: 50, successful: 45, failed: 5, byProvider: { lastfm: 25, fanart: 20 } },
      month: { total: 200, successful: 180, failed: 20, byProvider: { lastfm: 100, fanart: 80 } },
      allTime: { total: 1000, successful: 900, failed: 100, byProvider: { lastfm: 500, fanart: 400 } },
    },
    'dashboard:activity-stats': {
      totalUsers: 10,
      activeUsersLast24h: 3,
      activeUsersLast7d: 7,
    },
    'dashboard:activity-timeline': [
      { date: '2024-01-15', scans: 1, enrichments: 10, errors: 0 },
      { date: '2024-01-14', scans: 0, enrichments: 5, errors: 1 },
      { date: '2024-01-13', scans: 2, enrichments: 15, errors: 0 },
      { date: '2024-01-12', scans: 0, enrichments: 8, errors: 0 },
      { date: '2024-01-11', scans: 1, enrichments: 12, errors: 2 },
      { date: '2024-01-10', scans: 0, enrichments: 6, errors: 0 },
      { date: '2024-01-09', scans: 1, enrichments: 9, errors: 1 },
    ],
    'dashboard:recent-activities': [
      { id: '1', type: 'scan', action: 'Library scan', details: '100 tracks added', timestamp: '2024-01-15T10:00:00Z', status: 'success' },
      { id: '2', type: 'enrichment', action: 'Artist enriched', details: 'Avatar for Beatles', timestamp: '2024-01-15T09:30:00Z', status: 'success' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Minimal Drizzle mock - only used for health check
    mockDrizzle = {
      db: {
        execute: jest.fn().mockResolvedValue([{ '1': 1 }]),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      },
    };

    mockHealthCheck = {
      check: jest.fn().mockResolvedValue({
        status: 'healthy',
        services: { database: 'ok', cache: 'ok' },
      }),
    };

    mockSettingsService = {
      getString: jest.fn().mockResolvedValue(''),
    };

    // Cache returns all cached values
    mockCache = {
      get: jest.fn().mockImplementation((key: string) => fullCachedResponse[key] || null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new GetDashboardStatsUseCase(
      mockDrizzle,
      mockHealthCheck,
      mockSettingsService,
      mockCache,
    );
  });

  describe('execute', () => {
    it('should return complete dashboard stats structure', async () => {
      const result = await useCase.execute({});

      expect(result).toHaveProperty('libraryStats');
      expect(result).toHaveProperty('storageBreakdown');
      expect(result).toHaveProperty('systemHealth');
      expect(result).toHaveProperty('enrichmentStats');
      expect(result).toHaveProperty('activityStats');
      expect(result).toHaveProperty('scanStats');
      expect(result).toHaveProperty('activeAlerts');
      expect(result).toHaveProperty('activityTimeline');
      expect(result).toHaveProperty('recentActivities');
    });

    it('should use cached library stats', async () => {
      const result = await useCase.execute({});

      expect(result.libraryStats).toEqual(fullCachedResponse['dashboard:library-stats']);
      expect(mockCache.get).toHaveBeenCalledWith('dashboard:library-stats');
    });

    it('should use cached storage breakdown', async () => {
      const result = await useCase.execute({});

      expect(result.storageBreakdown).toEqual(fullCachedResponse['dashboard:storage-breakdown']);
    });

    it('should use cached enrichment stats', async () => {
      const result = await useCase.execute({});

      expect(result.enrichmentStats).toEqual(fullCachedResponse['dashboard:enrichment-stats']);
    });

    it('should use cached activity stats', async () => {
      const result = await useCase.execute({});

      expect(result.activityStats).toEqual(fullCachedResponse['dashboard:activity-stats']);
    });

    it('should use cached activity timeline', async () => {
      const result = await useCase.execute({});

      expect(result.activityTimeline).toEqual(fullCachedResponse['dashboard:activity-timeline']);
    });
  });

  describe('systemHealth', () => {
    it('should report healthy database when query succeeds', async () => {
      const result = await useCase.execute({});

      expect(result.systemHealth.database).toBe('healthy');
    });

    it('should report down database when query fails', async () => {
      mockDrizzle.db.execute.mockRejectedValue(new Error('Connection failed'));

      const result = await useCase.execute({});

      expect(result.systemHealth.database).toBe('down');
    });

    it('should report healthy redis from health check', async () => {
      const result = await useCase.execute({});

      expect(result.systemHealth.redis).toBe('healthy');
    });

    it('should report down redis when cache check fails', async () => {
      mockHealthCheck.check.mockResolvedValue({
        services: { cache: 'error' },
      });

      const result = await useCase.execute({});

      expect(result.systemHealth.redis).toBe('down');
    });

    it('should report musicbrainz as always healthy', async () => {
      const result = await useCase.execute({});

      expect(result.systemHealth.metadataApis.musicbrainz).toBe('healthy');
    });

    it('should report lastfm as healthy when API key configured', async () => {
      mockSettingsService.getString.mockImplementation((key: string) => {
        if (key === 'metadata.lastfm.api_key') return 'test-key';
        return '';
      });

      const result = await useCase.execute({});

      expect(result.systemHealth.metadataApis.lastfm).toBe('healthy');
    });

    it('should report lastfm as down when no API key', async () => {
      const result = await useCase.execute({});

      expect(result.systemHealth.metadataApis.lastfm).toBe('down');
    });

    it('should report fanart as healthy when API key configured', async () => {
      mockSettingsService.getString.mockImplementation((key: string) => {
        if (key === 'metadata.fanart.api_key') return 'test-key';
        return '';
      });

      const result = await useCase.execute({});

      expect(result.systemHealth.metadataApis.fanart).toBe('healthy');
    });
  });

  describe('scanStats', () => {
    it('should report scanner not running when no active scans', async () => {
      const result = await useCase.execute({});

      expect(result.scanStats.currentScan.isRunning).toBe(false);
    });

    it('should return null for lastScan dates when no scans', async () => {
      const result = await useCase.execute({});

      expect(result.scanStats.lastScan.startedAt).toBeNull();
      expect(result.scanStats.lastScan.finishedAt).toBeNull();
    });
  });

  describe('activeAlerts', () => {
    it('should return alert structure', async () => {
      const result = await useCase.execute({});

      expect(result.activeAlerts).toHaveProperty('orphanedFiles');
      expect(result.activeAlerts).toHaveProperty('pendingConflicts');
      expect(result.activeAlerts).toHaveProperty('storageWarning');
      expect(result.activeAlerts).toHaveProperty('scanErrors');
    });

    it('should return boolean storageWarning', async () => {
      const result = await useCase.execute({});

      expect(typeof result.activeAlerts.storageWarning).toBe('boolean');
    });
  });

  describe('libraryStats structure', () => {
    it('should have all required fields', async () => {
      const result = await useCase.execute({});

      expect(result.libraryStats).toHaveProperty('totalTracks');
      expect(result.libraryStats).toHaveProperty('totalAlbums');
      expect(result.libraryStats).toHaveProperty('totalArtists');
      expect(result.libraryStats).toHaveProperty('totalGenres');
      expect(result.libraryStats).toHaveProperty('totalDuration');
      expect(result.libraryStats).toHaveProperty('totalStorage');
      expect(result.libraryStats).toHaveProperty('tracksAddedToday');
      expect(result.libraryStats).toHaveProperty('albumsAddedToday');
      expect(result.libraryStats).toHaveProperty('artistsAddedToday');
    });
  });

  describe('enrichmentStats structure', () => {
    it('should have stats for all time periods', async () => {
      const result = await useCase.execute({});

      expect(result.enrichmentStats).toHaveProperty('today');
      expect(result.enrichmentStats).toHaveProperty('week');
      expect(result.enrichmentStats).toHaveProperty('month');
      expect(result.enrichmentStats).toHaveProperty('allTime');
    });

    it('should have correct structure for each period', async () => {
      const result = await useCase.execute({});

      ['today', 'week', 'month', 'allTime'].forEach((period) => {
        const stats = result.enrichmentStats[period as keyof typeof result.enrichmentStats];
        expect(stats).toHaveProperty('total');
        expect(stats).toHaveProperty('successful');
        expect(stats).toHaveProperty('failed');
        expect(stats).toHaveProperty('byProvider');
      });
    });
  });

  describe('activityTimeline', () => {
    it('should return 7 days of activity', async () => {
      const result = await useCase.execute({});

      expect(result.activityTimeline).toHaveLength(7);
    });

    it('should have correct structure for each day', async () => {
      const result = await useCase.execute({});

      result.activityTimeline.forEach((day) => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('scans');
        expect(day).toHaveProperty('enrichments');
        expect(day).toHaveProperty('errors');
      });
    });
  });

  describe('recentActivities', () => {
    it('should return array of activities', async () => {
      const result = await useCase.execute({});

      expect(Array.isArray(result.recentActivities)).toBe(true);
      expect(result.recentActivities.length).toBeGreaterThan(0);
    });

    it('should have correct activity structure', async () => {
      const result = await useCase.execute({});

      result.recentActivities.forEach((activity) => {
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('action');
        expect(activity).toHaveProperty('status');
      });
    });
  });
});
