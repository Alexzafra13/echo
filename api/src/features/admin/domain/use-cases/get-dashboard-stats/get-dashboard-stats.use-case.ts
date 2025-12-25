import { Injectable, Logger } from '@nestjs/common';
import {
  LibraryStatsService,
  StorageBreakdownService,
  SystemHealthService,
  EnrichmentStatsService,
  ActivityStatsService,
  ScanStatsService,
  AlertsService,
} from '../../../infrastructure/services';
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
    private readonly libraryStats: LibraryStatsService,
    private readonly storageBreakdown: StorageBreakdownService,
    private readonly systemHealth: SystemHealthService,
    private readonly enrichmentStats: EnrichmentStatsService,
    private readonly activityStats: ActivityStatsService,
    private readonly scanStats: ScanStatsService,
    private readonly alerts: AlertsService,
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
