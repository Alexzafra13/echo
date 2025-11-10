import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { RadioController } from './presentation/radio.controller';
import { SaveFavoriteStationUseCase } from './domain/use-cases/save-favorite-station/save-favorite-station.use-case';
import { GetUserFavoritesUseCase } from './domain/use-cases/get-user-favorites/get-user-favorites.use-case';
import { DeleteFavoriteStationUseCase } from './domain/use-cases/delete-favorite-station/delete-favorite-station.use-case';
import { SearchStationsUseCase } from './domain/use-cases/search-stations/search-stations.use-case';
import { PrismaRadioStationRepository } from './infrastructure/persistence/radio-station.repository';
import { RadioBrowserApiService } from './domain/services/radio-browser-api.service';
import { RADIO_STATION_REPOSITORY } from './domain/ports/radio-station-repository.port';

/**
 * RadioModule - Módulo de gestión de radio
 *
 * Estructura:
 * - Domain Layer: Use cases, entities, ports, services
 * - Infrastructure Layer: Repository, mapper
 * - Presentation Layer: Controller, DTOs
 *
 * Responsabilidades:
 * - Importar dependencias globales (Prisma)
 * - Registrar providers (use cases, repositorio, servicios)
 * - Exportar controllers
 *
 * Características:
 * - Integración con Radio Browser API (sin dependencias externas)
 * - Soporte para emisoras personalizadas (M3U streams)
 * - Sistema de favoritos por usuario
 * - Búsqueda avanzada por país, género, nombre
 */

@Module({
  imports: [
    PrismaModule, // Para acceso a la base de datos
  ],
  controllers: [RadioController],
  providers: [
    // Use Cases
    SaveFavoriteStationUseCase,
    GetUserFavoritesUseCase,
    DeleteFavoriteStationUseCase,
    SearchStationsUseCase,

    // Services
    RadioBrowserApiService,

    // Repositories
    PrismaRadioStationRepository,

    // Implementación del port
    {
      provide: RADIO_STATION_REPOSITORY,
      useClass: PrismaRadioStationRepository,
    },
  ],
  exports: [RADIO_STATION_REPOSITORY],
})
export class RadioModule {}
