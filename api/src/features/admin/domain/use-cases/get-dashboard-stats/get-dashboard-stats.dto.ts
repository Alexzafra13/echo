export interface GetDashboardStatsInput {
  // No input needed for now
}

export interface LibraryStats {
  totalTracks: number;
  totalAlbums: number;
  totalArtists: number;
  totalGenres: number;
  totalDuration: number; // in seconds
  totalStorage: number; // in bytes
  tracksAddedToday: number;
  albumsAddedToday: number;
  artistsAddedToday: number;
}

export interface StorageBreakdown {
  music: number; // bytes
  metadata: number; // bytes
  avatars: number; // bytes
  total: number; // bytes
}

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  scanner: 'idle' | 'running' | 'error';
  metadataApis: {
    lastfm: 'healthy' | 'degraded' | 'down';
    fanart: 'healthy' | 'degraded' | 'down';
    musicbrainz: 'healthy' | 'degraded' | 'down';
  };
  storage: 'healthy' | 'warning' | 'critical';
}

export interface EnrichmentStats {
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
  month: {
    total: number;
    successful: number;
    failed: number;
    byProvider: Record<string, number>;
  };
  allTime: {
    total: number;
    successful: number;
    failed: number;
    byProvider: Record<string, number>;
  };
}

export interface ActivityStats {
  totalUsers: number;
  activeUsersLast24h: number;
  activeUsersLast7d: number;
}

export interface ScanStats {
  lastScan: {
    startedAt: Date | null;
    finishedAt: Date | null;
    status: string | null;
    tracksAdded: number;
    tracksUpdated: number;
    tracksDeleted: number;
  };
  currentScan: {
    isRunning: boolean;
    startedAt: Date | null;
    progress: number; // 0-100
  };
}

export interface ActiveAlerts {
  orphanedFiles: number;
  pendingConflicts: number;
  missingFiles: number; // Tracks marked as missing (file not found)
  storageWarning: boolean;
  storageDetails?: {
    currentMB: number;
    limitMB: number;
    percentUsed: number;
  };
  scanErrors: number;
}

export interface ActivityTimelineDay {
  date: string; // ISO date string (YYYY-MM-DD)
  scans: number;
  enrichments: number;
  errors: number;
}

export interface RecentActivity {
  id: string;
  type: 'scan' | 'enrichment' | 'user' | 'system';
  action: string;
  details: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
}

export interface GetDashboardStatsOutput {
  libraryStats: LibraryStats;
  storageBreakdown: StorageBreakdown;
  systemHealth: SystemHealth;
  enrichmentStats: EnrichmentStats;
  activityStats: ActivityStats;
  scanStats: ScanStats;
  activeAlerts: ActiveAlerts;
  activityTimeline: ActivityTimelineDay[]; // Last 7 days
  recentActivities: RecentActivity[]; // Last 10 activities
}
