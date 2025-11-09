import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { AdminController } from './presentation/admin.controller';
import { EnrichmentHistoryController } from './presentation/enrichment-history.controller';
import { AlbumCoversController } from './presentation/album-covers.controller';
import { ArtistAvatarsController } from './presentation/artist-avatars.controller';
import { ArtistBannersManagementController } from './presentation/artist-banners.controller';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
  PermanentlyDeleteUserUseCase,
  ListEnrichmentLogsUseCase,
  GetEnrichmentStatsUseCase,
} from './domain/use-cases';
import { SearchAlbumCoversUseCase } from './domain/use-cases/search-album-covers';
import { ApplyAlbumCoverUseCase } from './domain/use-cases/apply-album-cover';
import { SearchArtistAvatarsUseCase } from './domain/use-cases/search-artist-avatars';
import { ApplyArtistAvatarUseCase } from './domain/use-cases/apply-artist-avatar';
import { UpdateArtistBackgroundPositionUseCase } from './domain/use-cases/update-artist-background-position';
import { ManageArtistBannersUseCase } from './domain/use-cases/manage-artist-banners';

@Module({
  imports: [AuthModule, PrismaModule, ExternalMetadataModule],
  controllers: [AdminController, EnrichmentHistoryController, AlbumCoversController, ArtistAvatarsController, ArtistBannersManagementController],
  providers: [
    CreateUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    ResetUserPasswordUseCase,
    PermanentlyDeleteUserUseCase,
    ListEnrichmentLogsUseCase,
    GetEnrichmentStatsUseCase,
    SearchAlbumCoversUseCase,
    ApplyAlbumCoverUseCase,
    SearchArtistAvatarsUseCase,
    ApplyArtistAvatarUseCase,
    UpdateArtistBackgroundPositionUseCase,
    ManageArtistBannersUseCase,
  ],
})
export class AdminModule {}