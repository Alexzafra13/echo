import { Module } from '@nestjs/common';
// New refactored controllers (smaller, focused)
import { InvitationController } from './presentation/invitation.controller';
import { ConnectedServerController } from './presentation/connected-server.controller';
import { RemoteLibraryController } from './presentation/remote-library.controller';
import { AccessTokenController } from './presentation/access-token.controller';
// Existing controllers
import { FederationPublicController } from './presentation/federation-public.controller';
import { FederationImportController } from './presentation/federation-import.controller';
import { FederationGateway } from './presentation/federation.gateway';
import { FederationTokenService } from './domain/services';
import { RemoteServerService, AlbumImportService, ImportProgressService } from './infrastructure/services';
import { FederationAccessGuard } from './presentation/guards';
import { FederationRepository } from './infrastructure/persistence/federation.repository';
import { FEDERATION_REPOSITORY } from './domain/ports/federation.repository';
import { CoverArtService } from '@shared/services';
import { StreamingModule } from '@features/streaming/streaming.module';

/**
 * FederationModule - Módulo de federación entre servidores Echo
 *
 * Permite compartir bibliotecas musicales entre diferentes instancias de Echo.
 * Los usuarios pueden:
 * - Crear tokens de invitación para que amigos se conecten
 * - Conectarse a servidores de amigos
 * - Ver la biblioteca de servidores conectados
 * - Reproducir música desde servidores remotos
 * - Descargar álbumes a su propio servidor
 *
 * Estructura:
 * - Domain Layer: Servicios de tokens y comunicación con servidores remotos
 * - Infrastructure Layer: Repositorio para persistencia de conexiones
 * - Presentation Layer: Controllers para API REST
 *
 * Controllers:
 * - InvitationController: Gestión de tokens de invitación
 * - ConnectedServerController: Gestión de servidores conectados
 * - RemoteLibraryController: Navegación de bibliotecas remotas
 * - AccessTokenController: Gestión de acceso y federación mutua
 * - FederationPublicController: Endpoints públicos para servidores remotos
 * - FederationImportController: Importación de álbumes
 *
 * Seguridad:
 * - Tokens de invitación temporales para establecer conexiones
 * - Tokens de acceso de larga duración para servidores conectados
 * - Permisos granulares (browse, stream, download)
 */
@Module({
  imports: [StreamingModule],
  controllers: [
    // Order matters: more specific routes first
    RemoteLibraryController,    // /federation/servers/:id/library, /albums, /tracks
    ConnectedServerController,  // /federation/servers/:id (less specific)
    InvitationController,
    AccessTokenController,
    FederationPublicController,
    FederationImportController,
  ],
  providers: [
    // Services
    FederationTokenService,
    RemoteServerService,
    AlbumImportService,
    ImportProgressService,
    FederationAccessGuard,
    CoverArtService,
    // WebSocket Gateway
    FederationGateway,
    // Repository
    {
      provide: FEDERATION_REPOSITORY,
      useClass: FederationRepository,
    },
  ],
  exports: [FederationTokenService, RemoteServerService, AlbumImportService, FEDERATION_REPOSITORY, FederationGateway],
})
export class FederationModule {}
