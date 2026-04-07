export interface GetDashboardStatsInput {}

export interface LibraryStats {
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
}

export interface StorageBreakdown {
  music: number;
  videos: number;
  metadata: number;
  avatars: number;
  radioFavicons: number;
  total: number;
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
    progress: number;
  };
}

export interface ActiveAlerts {
  orphanedFiles: number;
  pendingConflicts: number;
  missingFiles: number;
  storageWarning: boolean;
  storageDetails?: {
    currentMB: number;
    limitMB: number;
    percentUsed: number;
  };
  scanErrors: number;
}

export interface ActivityTimelineDay {
  date: string;
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

// ============================================
// Server Metrics (real-time monitoring)
// ============================================

export interface ServerMetrics {
  process: ProcessMetrics;
  system: SystemMetricsInfo;
  streaming: StreamingMetrics;
  queues: QueueMetricsItem[];
  database: DatabaseMetrics;
}

export interface ProcessMetrics {
  uptimeSeconds: number;
  memoryUsage: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
    heapUsagePercent: number;
  };
  cpuUsage: {
    userMicros: number;
    systemMicros: number;
  };
  nodeVersion: string;
  pid: number;
}

export interface SystemMetricsInfo {
  hostname: string;
  platform: string;
  arch: string;
  cpuCores: number;
  cpuModel: string;
  totalMemoryMB: number;
  freeMemoryMB: number;
  memoryUsagePercent: number;
  loadAverage: number[];
  uptimeSeconds: number;
  storage: {
    libraryPath: string;
    totalGB: number;
    freeGB: number;
    usedGB: number;
    usagePercent: number;
    status: 'ok' | 'warning' | 'critical';
  } | null;
}

export interface StreamingMetrics {
  activeStreams: number;
  totalStreamsServed: number;
  activeStreamTokens: number;
}

export interface QueueMetricsItem {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface DatabaseMetrics {
  pool: {
    totalConnections: number;
    idleConnections: number;
    waitingRequests: number;
    maxConnections: number;
  };
}

export interface GetDashboardStatsOutput {
  libraryStats: LibraryStats;
  storageBreakdown: StorageBreakdown;
  systemHealth: SystemHealth;
  enrichmentStats: EnrichmentStats;
  activityStats: ActivityStats;
  scanStats: ScanStats;
  activeAlerts: ActiveAlerts;
  activityTimeline: ActivityTimelineDay[];
  recentActivities: RecentActivity[];
}
