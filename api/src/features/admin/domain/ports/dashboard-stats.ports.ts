import {
  LibraryStats,
  StorageBreakdown,
  SystemHealth,
  EnrichmentStats,
  ActivityStats,
  ScanStats,
  ActiveAlerts,
  ActivityTimelineDay,
  RecentActivity,
} from '../use-cases/get-dashboard-stats/get-dashboard-stats.dto';

export interface ILibraryStatsProvider {
  get(): Promise<LibraryStats>;
}

export interface IStorageBreakdownProvider {
  get(): Promise<StorageBreakdown>;
}

export interface ISystemHealthChecker {
  check(storageBreakdown: StorageBreakdown): Promise<SystemHealth>;
}

export interface IEnrichmentStatsProvider {
  get(): Promise<EnrichmentStats>;
}

export interface IActivityStatsProvider {
  getStats(): Promise<ActivityStats>;
  getTimeline(): Promise<ActivityTimelineDay[]>;
  getRecentActivities(): Promise<RecentActivity[]>;
}

export interface IScanStatsProvider {
  get(): Promise<ScanStats>;
}

export interface IAlertsProvider {
  get(storageBreakdown: StorageBreakdown): Promise<ActiveAlerts>;
}

// Tokens de inyección
export const LIBRARY_STATS_PROVIDER = Symbol('LIBRARY_STATS_PROVIDER');
export const STORAGE_BREAKDOWN_PROVIDER = Symbol('STORAGE_BREAKDOWN_PROVIDER');
export const SYSTEM_HEALTH_CHECKER = Symbol('SYSTEM_HEALTH_CHECKER');
export const ENRICHMENT_STATS_PROVIDER = Symbol('ENRICHMENT_STATS_PROVIDER');
export const ACTIVITY_STATS_PROVIDER = Symbol('ACTIVITY_STATS_PROVIDER');
export const SCAN_STATS_PROVIDER = Symbol('SCAN_STATS_PROVIDER');
export const ALERTS_PROVIDER = Symbol('ALERTS_PROVIDER');
