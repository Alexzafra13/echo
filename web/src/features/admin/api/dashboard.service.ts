import { apiClient } from '@shared/services/api';

export interface DashboardStats {
  libraryStats: {
    totalTracks: number;
    totalAlbums: number;
    totalArtists: number;
    totalGenres: number;
    totalVideos: number;
    totalDuration: number;
    totalStorage: number;
    tracksAddedToday: number;
    albumsAddedToday: number;
    artistsAddedToday: number;
  };
  storageBreakdown: {
    music: number;
    videos: number;
    metadata: number;
    avatars: number;
    radioFavicons: number;
    total: number;
  };
  systemHealth: {
    database: 'healthy' | 'degraded' | 'down';
    redis: 'healthy' | 'degraded' | 'down';
    scanner: 'idle' | 'running' | 'error';
    metadataApis: {
      lastfm: 'healthy' | 'degraded' | 'down';
      fanart: 'healthy' | 'degraded' | 'down';
      musicbrainz: 'healthy' | 'degraded' | 'down';
    };
    storage: 'healthy' | 'warning' | 'critical';
  };
  enrichmentStats: {
    today: {
      total: number;
      successful: number;
      failed: number;
      byProvider: Record<string, number>;
    };
    week: {
      total: number;
      successful: number;
      failed: number;
      byProvider: Record<string, number>;
    };
  };
  activityStats: {
    totalUsers: number;
    activeUsersLast24h: number;
    activeUsersLast7d: number;
  };
  scanStats: {
    lastScan: {
      startedAt: string | null;
      finishedAt: string | null;
      status: string | null;
      tracksAdded: number;
      tracksUpdated: number;
      tracksDeleted: number;
    };
    currentScan: {
      isRunning: boolean;
      startedAt: string | null;
      progress: number;
    };
  };
  activeAlerts: {
    orphanedFiles: number;
    pendingConflicts: number;
    storageWarning: boolean;
    storageDetails?: {
      currentMB: number;
      limitMB: number;
      percentUsed: number;
    };
    scanErrors: number;
  };
  activityTimeline: Array<{
    date: string;
    scans: number;
    enrichments: number;
    errors: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: 'scan' | 'enrichment' | 'user' | 'system';
    action: string;
    details: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
}

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard/stats');
    return response.data;
  },
};
