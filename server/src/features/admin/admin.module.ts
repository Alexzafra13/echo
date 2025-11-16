import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { AdminController } from './presentation/admin.controller';
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
  ListEnrichmentLogsUseCase,
  GetEnrichmentStatsUseCase,
} from './domain/use-cases';
import { SearchAlbumCoversUseCase } from './domain/use-cases/search-album-covers';
import { ApplyAlbumCoverUseCase } from './domain/use-cases/apply-album-cover';
import { SearchArtistAvatarsUseCase } from './domain/use-cases/search-artist-avatars';
import { ApplyArtistAvatarUseCase } from './domain/use-cases/apply-artist-avatar';
import { UpdateArtistBackgroundPositionUseCase } from './domain/use-cases/update-artist-background-position';
import { ManageArtistBannersUseCase } from './domain/use-cases/manage-artist-banners';
import { UploadCustomArtistImageUseCase } from './domain/use-cases/upload-custom-artist-image';
import { ListCustomArtistImagesUseCase } from './domain/use-cases/list-custom-artist-images';
import { DeleteCustomArtistImageUseCase } from './domain/use-cases/delete-custom-artist-image';
import { ApplyCustomArtistImageUseCase } from './domain/use-cases/apply-custom-artist-image';
import { UploadCustomAlbumCoverUseCase } from './domain/use-cases/upload-custom-album-cover';
import { ListCustomAlbumCoversUseCase } from './domain/use-cases/list-custom-album-covers';
import { DeleteCustomAlbumCoverUseCase } from './domain/use-cases/delete-custom-album-cover';
import { ApplyCustomAlbumCoverUseCase } from './domain/use-cases/apply-custom-album-cover';

@Module({
  imports: [AuthModule, PrismaModule, ExternalMetadataModule],
  controllers: [
    AdminController,
    EnrichmentHistoryController,
    AlbumCoversController,
    ArtistAvatarsController,
    ArtistBannersManagementController,
    CustomArtistImagesController,
    CustomAlbumCoversController,
  ],
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