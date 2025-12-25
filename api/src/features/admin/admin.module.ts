import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { HealthModule } from '@features/health/health.module';
import { SocialModule } from '@features/social/social.module';
import { AdminController } from './presentation/admin.controller';
import { AdminDashboardController } from './presentation/admin-dashboard.controller';
import { AdminLibraryController } from './presentation/admin-library.controller';
import { EnrichmentHistoryController } from './presentation/enrichment-history.controller';
import { AlbumCoversController } from './presentation/album-covers.controller';
import { ArtistAvatarsController } from './presentation/artist-avatars.controller';
import { ArtistBannersManagementController } from './presentation/artist-banners.controller';
import { CustomArtistImagesController } from './presentation/custom-artist-images.controller';
import { CustomAlbumCoversController } from './presentation/custom-album-covers.controller';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
  PermanentlyDeleteUserUseCase,
  GetDashboardStatsUseCase,
} from './domain/use-cases';
import { ListEnrichmentLogsUseCase } from './infrastructure/use-cases/list-enrichment-logs';
import { GetEnrichmentStatsUseCase } from './infrastructure/use-cases/get-enrichment-stats';
import { SearchAlbumCoversUseCase } from './infrastructure/use-cases/search-album-covers';
import { ApplyAlbumCoverUseCase } from './infrastructure/use-cases/apply-album-cover';
import { SearchArtistAvatarsUseCase } from './infrastructure/use-cases/search-artist-avatars';
import { ApplyArtistAvatarUseCase } from './infrastructure/use-cases/apply-artist-avatar';
import { UpdateArtistBackgroundPositionUseCase } from './infrastructure/use-cases/update-artist-background-position';
import { ManageArtistBannersUseCase } from './infrastructure/use-cases/manage-artist-banners';
import { UploadCustomArtistImageUseCase } from './infrastructure/use-cases/upload-custom-artist-image';
import { ListCustomArtistImagesUseCase } from './infrastructure/use-cases/list-custom-artist-images';
import { DeleteCustomArtistImageUseCase } from './infrastructure/use-cases/delete-custom-artist-image';
import { ApplyCustomArtistImageUseCase } from './infrastructure/use-cases/apply-custom-artist-image';
import { UploadCustomAlbumCoverUseCase } from './infrastructure/use-cases/upload-custom-album-cover';
import { ListCustomAlbumCoversUseCase } from './infrastructure/use-cases/list-custom-album-covers';
import { DeleteCustomAlbumCoverUseCase } from './infrastructure/use-cases/delete-custom-album-cover';
import { ApplyCustomAlbumCoverUseCase } from './infrastructure/use-cases/apply-custom-album-cover';
import {
  LibraryStatsService,
  StorageBreakdownService,
  SystemHealthService,
  EnrichmentStatsService,
  ActivityStatsService,
  ScanStatsService,
  AlertsService,
} from './infrastructure/services';
import {
  LIBRARY_STATS_PROVIDER,
  STORAGE_BREAKDOWN_PROVIDER,
  SYSTEM_HEALTH_CHECKER,
  ENRICHMENT_STATS_PROVIDER,
  ACTIVITY_STATS_PROVIDER,
  SCAN_STATS_PROVIDER,
  ALERTS_PROVIDER,
} from './domain/ports';

@Module({
  imports: [AuthModule, ExternalMetadataModule, HealthModule, SocialModule],
  controllers: [
    AdminController,
    AdminDashboardController,
    AdminLibraryController,
    EnrichmentHistoryController,
    AlbumCoversController,
    ArtistAvatarsController,
    ArtistBannersManagementController,
    CustomArtistImagesController,
    CustomAlbumCoversController,
  ],
  providers: [
    // Dashboard services (implementing domain ports)
    { provide: LIBRARY_STATS_PROVIDER, useClass: LibraryStatsService },
    { provide: STORAGE_BREAKDOWN_PROVIDER, useClass: StorageBreakdownService },
    { provide: SYSTEM_HEALTH_CHECKER, useClass: SystemHealthService },
    { provide: ENRICHMENT_STATS_PROVIDER, useClass: EnrichmentStatsService },
    { provide: ACTIVITY_STATS_PROVIDER, useClass: ActivityStatsService },
    { provide: SCAN_STATS_PROVIDER, useClass: ScanStatsService },
    { provide: ALERTS_PROVIDER, useClass: AlertsService },
    // Use cases
    CreateUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    ResetUserPasswordUseCase,
    PermanentlyDeleteUserUseCase,
    ListEnrichmentLogsUseCase,
    GetEnrichmentStatsUseCase,
    GetDashboardStatsUseCase,
    SearchAlbumCoversUseCase,
    ApplyAlbumCoverUseCase,
    SearchArtistAvatarsUseCase,
    ApplyArtistAvatarUseCase,
    UpdateArtistBackgroundPositionUseCase,
    ManageArtistBannersUseCase,
    UploadCustomArtistImageUseCase,
    ListCustomArtistImagesUseCase,
    DeleteCustomArtistImageUseCase,
    ApplyCustomArtistImageUseCase,
    UploadCustomAlbumCoverUseCase,
    ListCustomAlbumCoversUseCase,
    DeleteCustomAlbumCoverUseCase,
    ApplyCustomAlbumCoverUseCase,
  ],
})
export class AdminModule {}
