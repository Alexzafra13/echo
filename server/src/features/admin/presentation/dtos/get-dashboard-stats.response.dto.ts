import { ApiProperty } from '@nestjs/swagger';
import { GetDashboardStatsOutput } from '../../domain/use-cases';

class LibraryStatsDto {
  @ApiProperty({ example: 1234, description: 'Total number of tracks' })
  totalTracks!: number;

  @ApiProperty({ example: 156, description: 'Total number of albums' })
  totalAlbums!: number;

  @ApiProperty({ example: 89, description: 'Total number of artists' })
  totalArtists!: number;

  @ApiProperty({ example: 23, description: 'Total number of genres' })
  totalGenres!: number;

  @ApiProperty({ example: 345600, description: 'Total duration in seconds' })
  totalDuration!: number;

  @ApiProperty({ example: 5368709120, description: 'Total storage in bytes' })
  totalStorage!: number;

  @ApiProperty({ example: 12, description: 'Tracks added today' })
  tracksAddedToday!: number;

  @ApiProperty({ example: 3, description: 'Albums added today' })
  albumsAddedToday!: number;

  @ApiProperty({ example: 2, description: 'Artists added today' })
  artistsAddedToday!: number;
}

class StorageBreakdownDto {
  @ApiProperty({ example: 5000000000, description: 'Music storage in bytes' })
  music!: number;

  @ApiProperty({ example: 300000000, description: 'Metadata storage in bytes' })
  metadata!: number;

  @ApiProperty({ example: 50000000, description: 'Avatar storage in bytes' })
  avatars!: number;

  @ApiProperty({ example: 5350000000, description: 'Total storage in bytes' })
  total!: number;
}

class MetadataApisHealthDto {
  @ApiProperty({ enum: ['healthy', 'degraded', 'down'], example: 'healthy' })
  lastfm!: 'healthy' | 'degraded' | 'down';

  @ApiProperty({ enum: ['healthy', 'degraded', 'down'], example: 'healthy' })
  fanart!: 'healthy' | 'degraded' | 'down';

  @ApiProperty({ enum: ['healthy', 'degraded', 'down'], example: 'healthy' })
  musicbrainz!: 'healthy' | 'degraded' | 'down';
}

class SystemHealthDto {
  @ApiProperty({ enum: ['healthy', 'degraded', 'down'], example: 'healthy' })
  database!: 'healthy' | 'degraded' | 'down';

  @ApiProperty({ enum: ['healthy', 'degraded', 'down'], example: 'healthy' })
  redis!: 'healthy' | 'degraded' | 'down';

  @ApiProperty({ enum: ['idle', 'running', 'error'], example: 'idle' })
  scanner!: 'idle' | 'running' | 'error';

  @ApiProperty({ type: MetadataApisHealthDto })
  metadataApis!: MetadataApisHealthDto;

  @ApiProperty({ enum: ['healthy', 'warning', 'critical'], example: 'healthy' })
  storage!: 'healthy' | 'warning' | 'critical';
}

class EnrichmentPeriodStatsDto {
  @ApiProperty({ example: 45, description: 'Total enrichments' })
  total!: number;

  @ApiProperty({ example: 42, description: 'Successful enrichments' })
  successful!: number;

  @ApiProperty({ example: 3, description: 'Failed enrichments' })
  failed!: number;

  @ApiProperty({
    example: { lastfm: 20, fanart: 25 },
    description: 'Enrichments by provider',
  })
  byProvider!: Record<string, number>;
}

class EnrichmentStatsDto {
  @ApiProperty({ type: EnrichmentPeriodStatsDto })
  today!: EnrichmentPeriodStatsDto;

  @ApiProperty({ type: EnrichmentPeriodStatsDto })
  week!: EnrichmentPeriodStatsDto;

  @ApiProperty({ type: EnrichmentPeriodStatsDto })
  month!: EnrichmentPeriodStatsDto;

  @ApiProperty({ type: EnrichmentPeriodStatsDto })
  allTime!: EnrichmentPeriodStatsDto;
}

class ActivityStatsDto {
  @ApiProperty({ example: 10, description: 'Total users' })
  totalUsers!: number;

  @ApiProperty({ example: 3, description: 'Active users in last 24 hours' })
  activeUsersLast24h!: number;

  @ApiProperty({ example: 7, description: 'Active users in last 7 days' })
  activeUsersLast7d!: number;
}

class LastScanDto {
  @ApiProperty({ example: '2025-01-15T10:30:00Z', nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ example: '2025-01-15T10:45:00Z', nullable: true })
  finishedAt!: Date | null;

  @ApiProperty({ example: 'completed', nullable: true })
  status!: string | null;

  @ApiProperty({ example: 12, description: 'Tracks added in last scan' })
  tracksAdded!: number;

  @ApiProperty({ example: 5, description: 'Tracks updated in last scan' })
  tracksUpdated!: number;

  @ApiProperty({ example: 0, description: 'Tracks deleted in last scan' })
  tracksDeleted!: number;
}

class CurrentScanDto {
  @ApiProperty({ example: false, description: 'Whether a scan is currently running' })
  isRunning!: boolean;

  @ApiProperty({ example: '2025-01-15T12:00:00Z', nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ example: 45, description: 'Scan progress (0-100)' })
  progress!: number;
}

class ScanStatsDto {
  @ApiProperty({ type: LastScanDto })
  lastScan!: LastScanDto;

  @ApiProperty({ type: CurrentScanDto })
  currentScan!: CurrentScanDto;
}

class ActiveAlertsDto {
  @ApiProperty({ example: 5, description: 'Number of orphaned files' })
  orphanedFiles!: number;

  @ApiProperty({ example: 2, description: 'Number of pending conflicts' })
  pendingConflicts!: number;

  @ApiProperty({ example: false, description: 'Storage warning flag' })
  storageWarning!: boolean;

  @ApiProperty({ example: 0, description: 'Number of recent scan errors' })
  scanErrors!: number;
}

class ActivityTimelineDayDto {
  @ApiProperty({ example: '2025-01-15', description: 'Date in ISO format (YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({ example: 3, description: 'Number of scans this day' })
  scans!: number;

  @ApiProperty({ example: 45, description: 'Number of enrichments this day' })
  enrichments!: number;

  @ApiProperty({ example: 2, description: 'Number of errors this day' })
  errors!: number;
}

class RecentActivityDto {
  @ApiProperty({ example: 'abc-123', description: 'Activity ID' })
  id!: string;

  @ApiProperty({ enum: ['scan', 'enrichment', 'user', 'system'], example: 'scan' })
  type!: 'scan' | 'enrichment' | 'user' | 'system';

  @ApiProperty({ example: 'Escaneo de librería', description: 'Activity action' })
  action!: string;

  @ApiProperty({ example: '12 agregadas, 5 actualizadas', description: 'Activity details' })
  details!: string;

  @ApiProperty({ example: '2025-01-15T10:30:00Z', description: 'Activity timestamp' })
  timestamp!: Date;

  @ApiProperty({ enum: ['success', 'warning', 'error'], example: 'success' })
  status!: 'success' | 'warning' | 'error';
}

export class GetDashboardStatsResponseDto {
  @ApiProperty({ type: LibraryStatsDto })
  libraryStats!: LibraryStatsDto;

  @ApiProperty({ type: StorageBreakdownDto })
  storageBreakdown!: StorageBreakdownDto;

  @ApiProperty({ type: SystemHealthDto })
  systemHealth!: SystemHealthDto;

  @ApiProperty({ type: EnrichmentStatsDto })
  enrichmentStats!: EnrichmentStatsDto;

  @ApiProperty({ type: ActivityStatsDto })
  activityStats!: ActivityStatsDto;

  @ApiProperty({ type: ScanStatsDto })
  scanStats!: ScanStatsDto;

  @ApiProperty({ type: ActiveAlertsDto })
  activeAlerts!: ActiveAlertsDto;

  @ApiProperty({ type: [ActivityTimelineDayDto], description: 'Activity timeline for last 7 days' })
  activityTimeline!: ActivityTimelineDayDto[];

  @ApiProperty({ type: [RecentActivityDto], description: 'Recent activities (last 10)' })
  recentActivities!: RecentActivityDto[];

  static fromDomain(output: GetDashboardStatsOutput): GetDashboardStatsResponseDto {
    return output as GetDashboardStatsResponseDto;
  }
}
