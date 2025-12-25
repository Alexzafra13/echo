import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ILibraryStatsProvider,
  IStorageBreakdownProvider,
  ISystemHealthChecker,
  IEnrichmentStatsProvider,
  IActivityStatsProvider,
  IScanStatsProvider,
  IAlertsProvider,
  LIBRARY_STATS_PROVIDER,
  STORAGE_BREAKDOWN_PROVIDER,
  SYSTEM_HEALTH_CHECKER,
  ENRICHMENT_STATS_PROVIDER,
  ACTIVITY_STATS_PROVIDER,
  SCAN_STATS_PROVIDER,
  ALERTS_PROVIDER,
} from '../../ports';
import { GetDashboardStatsInput, GetDashboardStatsOutput } from './get-dashboard-stats.dto';

/**
 * GetDashboardStatsUseCase - Orchestrates dashboard statistics retrieval
 *
 * This use case delegates to specialized services for each type of statistic,
 * following the Single Responsibility Principle.
 */
@Injectable()
export class GetDashboardStatsUseCase {
  private readonly logger = new Logger(GetDashboardStatsUseCase.name);

  constructor(
    @Inject(LIBRARY_STATS_PROVIDER)
    private readonly libraryStats: ILibraryStatsProvider,
    @Inject(STORAGE_BREAKDOWN_PROVIDER)
    private readonly storageBreakdown: IStorageBreakdownProvider,
    @Inject(SYSTEM_HEALTH_CHECKER)
    private readonly systemHealth: ISystemHealthChecker,
    @Inject(ENRICHMENT_STATS_PROVIDER)
    private readonly enrichmentStats: IEnrichmentStatsProvider,
    @Inject(ACTIVITY_STATS_PROVIDER)
    private readonly activityStats: IActivityStatsProvider,
    @Inject(SCAN_STATS_PROVIDER)
    private readonly scanStats: IScanStatsProvider,
    @Inject(ALERTS_PROVIDER)
    private readonly alerts: IAlertsProvider,
  ) {}

  async execute(_input: GetDashboardStatsInput): Promise<GetDashboardStatsOutput> {
    try {
      // Get storage breakdown first (needed by systemHealth and alerts)
      const storageBreakdownData = await this.storageBreakdown.get();

      // Get all other stats in parallel
      const [
        libraryStatsData,
        systemHealthData,
        enrichmentStatsData,
        activityStatsData,
        scanStatsData,
        activeAlertsData,
        activityTimelineData,
        recentActivitiesData,
      ] = await Promise.all([
        this.libraryStats.get(),
        this.systemHealth.check(storageBreakdownData),
        this.enrichmentStats.get(),
        this.activityStats.getStats(),
        this.scanStats.get(),
        this.alerts.get(storageBreakdownData),
        this.activityStats.getTimeline(),
        this.activityStats.getRecentActivities(),
      ]);

      return {
        libraryStats: libraryStatsData,
        storageBreakdown: storageBreakdownData,
        systemHealth: systemHealthData,
        enrichmentStats: enrichmentStatsData,
        activityStats: activityStatsData,
        scanStats: scanStatsData,
        activeAlerts: activeAlertsData,
        activityTimeline: activityTimelineData,
        recentActivities: recentActivitiesData,
      };
    } catch (error) {
      this.logger.error(
        `Error getting dashboard stats: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
