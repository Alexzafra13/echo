import { Module, forwardRef } from '@nestjs/common';
import { InvitationController } from './presentation/invitation.controller';
import { ConnectedServerController } from './presentation/connected-server.controller';
import { RemoteLibraryController } from './presentation/remote-library.controller';
import { AccessTokenController } from './presentation/access-token.controller';
import { FederationPublicController } from './presentation/federation-public.controller';
import { FederationImportController } from './presentation/federation-import.controller';
import { FederationTokenService } from './domain/services';
import { RemoteServerService, AlbumImportService, ImportProgressService } from './infrastructure/services';
import { FederationAccessGuard } from './presentation/guards';
import { FederationRepository } from './infrastructure/persistence/federation.repository';
import { FEDERATION_REPOSITORY } from './domain/ports/federation.repository';
import { CoverArtService } from '@shared/services';
import { StreamingModule } from '@features/streaming/streaming.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';

@Module({
  imports: [StreamingModule, forwardRef(() => ExternalMetadataModule)],
  controllers: [
    // Rutas más específicas primero
    RemoteLibraryController,
    ConnectedServerController,
    InvitationController,
    AccessTokenController,
    FederationPublicController,
    FederationImportController,
  ],
  providers: [
    FederationTokenService,
    RemoteServerService,
    AlbumImportService,
    ImportProgressService,
    FederationAccessGuard,
    CoverArtService,
    {
      provide: FEDERATION_REPOSITORY,
      useClass: FederationRepository,
    },
  ],
  exports: [FederationTokenService, RemoteServerService, AlbumImportService, FEDERATION_REPOSITORY],
})
export class FederationModule {}
