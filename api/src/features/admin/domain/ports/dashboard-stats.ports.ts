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

/**
 * Port for retrieving library statistics
 */
export interface ILibraryStatsProvider {
  get(): Promise<LibraryStats>;
}

/**
 * Port for retrieving storage breakdown
 */
export interface IStorageBreakdownProvider {
  get(): Promise<StorageBreakdown>;
}

/**
 * Port for checking system health
 */
export interface ISystemHealthChecker {
  check(storageBreakdown: StorageBreakdown): Promise<SystemHealth>;
}

/**
 * Port for retrieving enrichment statistics
 */
export interface IEnrichmentStatsProvider {
  get(): Promise<EnrichmentStats>;
}

/**
 * Port for retrieving activity statistics
 */
export interface IActivityStatsProvider {
  getStats(): Promise<ActivityStats>;
  getTimeline(): Promise<ActivityTimelineDay[]>;
  getRecentActivities(): Promise<RecentActivity[]>;
}

/**
 * Port for retrieving scan statistics
 */
export interface IScanStatsProvider {
  get(): Promise<ScanStats>;
}

/**
 * Port for retrieving active alerts
 */
export interface IAlertsProvider {
  get(storageBreakdown: StorageBreakdown): Promise<ActiveAlerts>;
}

// Injection tokens
export const LIBRARY_STATS_PROVIDER = Symbol('LIBRARY_STATS_PROVIDER');
export const STORAGE_BREAKDOWN_PROVIDER = Symbol('STORAGE_BREAKDOWN_PROVIDER');
export const SYSTEM_HEALTH_CHECKER = Symbol('SYSTEM_HEALTH_CHECKER');
export const ENRICHMENT_STATS_PROVIDER = Symbol('ENRICHMENT_STATS_PROVIDER');
export const ACTIVITY_STATS_PROVIDER = Symbol('ACTIVITY_STATS_PROVIDER');
export const SCAN_STATS_PROVIDER = Symbol('SCAN_STATS_PROVIDER');
export const ALERTS_PROVIDER = Symbol('ALERTS_PROVIDER');
