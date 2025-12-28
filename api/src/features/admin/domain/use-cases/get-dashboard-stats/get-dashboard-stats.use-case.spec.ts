import { PinoLogger } from 'nestjs-pino';
import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case';
import {
  ILibraryStatsProvider,
  IStorageBreakdownProvider,
  ISystemHealthChecker,
  IEnrichmentStatsProvider,
  IActivityStatsProvider,
  IScanStatsProvider,
  IAlertsProvider,
} from '../../ports';

const createMockLogger = (): jest.Mocked<PinoLogger> =>
  ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    assign: jest.fn(),
  }) as unknown as jest.Mocked<PinoLogger>;

describe('GetDashboardStatsUseCase', () => {
  let useCase: GetDashboardStatsUseCase;
  let mockLogger: jest.Mocked<PinoLogger>;
  let mockLibraryStats: jest.Mocked<ILibraryStatsProvider>;
  let mockStorageBreakdown: jest.Mocked<IStorageBreakdownProvider>;
  let mockSystemHealth: jest.Mocked<ISystemHealthChecker>;
  let mockEnrichmentStats: jest.Mocked<IEnrichmentStatsProvider>;
  let mockActivityStats: jest.Mocked<IActivityStatsProvider>;
  let mockScanStats: jest.Mocked<IScanStatsProvider>;
  let mockAlerts: jest.Mocked<IAlertsProvider>;

  const libraryStatsData = {
    totalTracks: 1000,
    totalAlbums: 100,
    totalArtists: 50,
    totalGenres: 20,
    totalDuration: 360000,
    totalStorage: 5000000000,
    tracksAddedToday: 5,
    albumsAddedToday: 1,
    artistsAddedToday: 1,
  };

  const storageBreakdownData = {
    music: 4000000000,
    metadata: 500000000,
    avatars: 10000000,
    total: 4510000000,
  };

  const systemHealthData = {
    database: 'healthy' as const,
    redis: 'healthy' as const,
    fileSystem: 'healthy' as const,
    metadataApis: {
      musicbrainz: 'healthy' as const,
      lastfm: 'healthy' as const,
      fanart: 'down' as const,
    },
  };

  const enrichmentStatsData = {
    today: { total: 10, successful: 8, failed: 2, byProvider: { lastfm: 5, fanart: 3 } },
    week: { total: 50, successful: 45, failed: 5, byProvider: { lastfm: 25, fanart: 20 } },
    month: { total: 200, successful: 180, failed: 20, byProvider: { lastfm: 100, fanart: 80 } },
    allTime: { total: 1000, successful: 900, failed: 100, byProvider: { lastfm: 500, fanart: 400 } },
  };

  const activityStatsData = {
    totalUsers: 10,
    activeUsersLast24h: 3,
    activeUsersLast7d: 7,
  };

  const scanStatsData = {
    currentScan: {
      isRunning: false,
      currentPath: null,
      progress: 0,
      processedFiles: 0,
      totalFiles: 0,
    },
    lastScan: {
      startedAt: null,
      finishedAt: null,
      tracksAdded: 0,
      tracksUpdated: 0,
      tracksRemoved: 0,
      errors: 0,
    },
  };

  const activeAlertsData = {
    orphanedFiles: 0,
    pendingConflicts: 0,
    storageWarning: false,
    scanErrors: 0,
  };

  const activityTimelineData = [
    { date: '2024-01-15', scans: 1, enrichments: 10, errors: 0 },
    { date: '2024-01-14', scans: 0, enrichments: 5, errors: 1 },
    { date: '2024-01-13', scans: 2, enrichments: 15, errors: 0 },
    { date: '2024-01-12', scans: 0, enrichments: 8, errors: 0 },
    { date: '2024-01-11', scans: 1, enrichments: 12, errors: 2 },
    { date: '2024-01-10', scans: 0, enrichments: 6, errors: 0 },
    { date: '2024-01-09', scans: 1, enrichments: 9, errors: 1 },
  ];

  const recentActivitiesData = [
    { id: '1', type: 'scan', action: 'Library scan', details: '100 tracks added', timestamp: '2024-01-15T10:00:00Z', status: 'success' },
    { id: '2', type: 'enrichment', action: 'Artist enriched', details: 'Avatar for Beatles', timestamp: '2024-01-15T09:30:00Z', status: 'success' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = createMockLogger();

    mockLibraryStats = {
      get: jest.fn().mockResolvedValue(libraryStatsData),
    } as any;

    mockStorageBreakdown = {
      get: jest.fn().mockResolvedValue(storageBreakdownData),
    } as any;

    mockSystemHealth = {
      check: jest.fn().mockResolvedValue(systemHealthData),
    } as any;

    mockEnrichmentStats = {
      get: jest.fn().mockResolvedValue(enrichmentStatsData),
    } as any;

    mockActivityStats = {
      getStats: jest.fn().mockResolvedValue(activityStatsData),
      getTimeline: jest.fn().mockResolvedValue(activityTimelineData),
      getRecentActivities: jest.fn().mockResolvedValue(recentActivitiesData),
    } as any;

    mockScanStats = {
      get: jest.fn().mockResolvedValue(scanStatsData),
    } as any;

    mockAlerts = {
      get: jest.fn().mockResolvedValue(activeAlertsData),
    } as any;

    useCase = new GetDashboardStatsUseCase(
      mockLogger,
      mockLibraryStats,
      mockStorageBreakdown,
      mockSystemHealth,
      mockEnrichmentStats,
      mockActivityStats,
      mockScanStats,
      mockAlerts,
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

    it('should call all services', async () => {
      await useCase.execute({});

      expect(mockLibraryStats.get).toHaveBeenCalledTimes(1);
      expect(mockStorageBreakdown.get).toHaveBeenCalledTimes(1);
      expect(mockSystemHealth.check).toHaveBeenCalledTimes(1);
      expect(mockEnrichmentStats.get).toHaveBeenCalledTimes(1);
      expect(mockActivityStats.getStats).toHaveBeenCalledTimes(1);
      expect(mockActivityStats.getTimeline).toHaveBeenCalledTimes(1);
      expect(mockActivityStats.getRecentActivities).toHaveBeenCalledTimes(1);
      expect(mockScanStats.get).toHaveBeenCalledTimes(1);
      expect(mockAlerts.get).toHaveBeenCalledTimes(1);
    });

    it('should pass storage breakdown to systemHealth.check', async () => {
      await useCase.execute({});

      expect(mockSystemHealth.check).toHaveBeenCalledWith(storageBreakdownData);
    });

    it('should pass storage breakdown to alerts.get', async () => {
      await useCase.execute({});

      expect(mockAlerts.get).toHaveBeenCalledWith(storageBreakdownData);
    });

    it('should get storage breakdown first before parallel calls', async () => {
      const callOrder: string[] = [];

      mockStorageBreakdown.get = jest.fn().mockImplementation(async () => {
        callOrder.push('storageBreakdown');
        return storageBreakdownData;
      });

      mockSystemHealth.check = jest.fn().mockImplementation(async () => {
        callOrder.push('systemHealth');
        return systemHealthData;
      });

      await useCase.execute({});

      // storageBreakdown should be called before systemHealth
      expect(callOrder.indexOf('storageBreakdown')).toBeLessThan(
        callOrder.indexOf('systemHealth'),
      );
    });

    it('should return library stats from service', async () => {
      const result = await useCase.execute({});

      expect(result.libraryStats).toEqual(libraryStatsData);
    });

    it('should return storage breakdown from service', async () => {
      const result = await useCase.execute({});

      expect(result.storageBreakdown).toEqual(storageBreakdownData);
    });

    it('should return system health from service', async () => {
      const result = await useCase.execute({});

      expect(result.systemHealth).toEqual(systemHealthData);
    });

    it('should return enrichment stats from service', async () => {
      const result = await useCase.execute({});

      expect(result.enrichmentStats).toEqual(enrichmentStatsData);
    });

    it('should return activity stats from service', async () => {
      const result = await useCase.execute({});

      expect(result.activityStats).toEqual(activityStatsData);
    });

    it('should return scan stats from service', async () => {
      const result = await useCase.execute({});

      expect(result.scanStats).toEqual(scanStatsData);
    });

    it('should return active alerts from service', async () => {
      const result = await useCase.execute({});

      expect(result.activeAlerts).toEqual(activeAlertsData);
    });

    it('should return activity timeline from service', async () => {
      const result = await useCase.execute({});

      expect(result.activityTimeline).toEqual(activityTimelineData);
    });

    it('should return recent activities from service', async () => {
      const result = await useCase.execute({});

      expect(result.recentActivities).toEqual(recentActivitiesData);
    });

    it('should throw error when library stats service fails', async () => {
      mockLibraryStats.get.mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute({})).rejects.toThrow('Database error');
    });

    it('should throw error when storage breakdown service fails', async () => {
      mockStorageBreakdown.get.mockRejectedValue(new Error('Storage error'));

      await expect(useCase.execute({})).rejects.toThrow('Storage error');
    });

    it('should throw error when system health service fails', async () => {
      mockSystemHealth.check.mockRejectedValue(new Error('Health check failed'));

      await expect(useCase.execute({})).rejects.toThrow('Health check failed');
    });

    it('should throw error when enrichment stats service fails', async () => {
      mockEnrichmentStats.get.mockRejectedValue(new Error('Enrichment error'));

      await expect(useCase.execute({})).rejects.toThrow('Enrichment error');
    });

    it('should throw error when activity stats service fails', async () => {
      mockActivityStats.getStats.mockRejectedValue(new Error('Activity error'));

      await expect(useCase.execute({})).rejects.toThrow('Activity error');
    });

    it('should throw error when scan stats service fails', async () => {
      mockScanStats.get.mockRejectedValue(new Error('Scan error'));

      await expect(useCase.execute({})).rejects.toThrow('Scan error');
    });

    it('should throw error when alerts service fails', async () => {
      mockAlerts.get.mockRejectedValue(new Error('Alerts error'));

      await expect(useCase.execute({})).rejects.toThrow('Alerts error');
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

  describe('systemHealth structure', () => {
    it('should have all required fields', async () => {
      const result = await useCase.execute({});

      expect(result.systemHealth).toHaveProperty('database');
      expect(result.systemHealth).toHaveProperty('redis');
      expect(result.systemHealth).toHaveProperty('fileSystem');
      expect(result.systemHealth).toHaveProperty('metadataApis');
    });

    it('should have metadata API statuses', async () => {
      const result = await useCase.execute({});

      expect(result.systemHealth.metadataApis).toHaveProperty('musicbrainz');
      expect(result.systemHealth.metadataApis).toHaveProperty('lastfm');
      expect(result.systemHealth.metadataApis).toHaveProperty('fanart');
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

  describe('scanStats structure', () => {
    it('should have current scan info', async () => {
      const result = await useCase.execute({});

      expect(result.scanStats).toHaveProperty('currentScan');
      expect(result.scanStats.currentScan).toHaveProperty('isRunning');
      expect(result.scanStats.currentScan).toHaveProperty('progress');
    });

    it('should have last scan info', async () => {
      const result = await useCase.execute({});

      expect(result.scanStats).toHaveProperty('lastScan');
      expect(result.scanStats.lastScan).toHaveProperty('startedAt');
      expect(result.scanStats.lastScan).toHaveProperty('finishedAt');
    });
  });

  describe('activeAlerts structure', () => {
    it('should have all alert types', async () => {
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
