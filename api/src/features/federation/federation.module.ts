import { Module } from '@nestjs/common';
import { FederationController } from './presentation/federation.controller';
import { FederationPublicController } from './presentation/federation-public.controller';
import { FederationImportController } from './presentation/federation-import.controller';
import { FederationGateway } from './presentation/federation.gateway';
import { FederationTokenService, RemoteServerService, AlbumImportService } from './domain/services';
import { FederationAccessGuard } from './domain/services/federation-access.guard';
import { FederationRepository } from './infrastructure/persistence/federation.repository';
import { FEDERATION_REPOSITORY } from './domain/ports/federation.repository';
import { CoverArtService } from '@shared/services';

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
 * Seguridad:
 * - Tokens de invitación temporales para establecer conexiones
 * - Tokens de acceso de larga duración para servidores conectados
 * - Permisos granulares (browse, stream, download)
 */
@Module({
  controllers: [FederationController, FederationPublicController, FederationImportController],
  providers: [
    // Services
    FederationTokenService,
    RemoteServerService,
    AlbumImportService,
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
