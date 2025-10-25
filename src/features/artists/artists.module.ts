import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { ArtistsController } from './presentation/controller/artists.controller';
import { GetArtistUseCase, GetArtistsUseCase, SearchArtistsUseCase } from './domain/use-cases';
import { PrismaArtistRepository } from './infrastructure/persistence/artist.repository';
import { ARTIST_REPOSITORY } from './domain/ports/artist-repository.port';

/**
 * ArtistsModule - Módulo de gestión de artistas
 *
 * Estructura:
 * - Domain Layer: Use cases, entities, ports
 * - Infrastructure Layer: Repository, mapper
 * - Presentation Layer: Controller, DTOs
 *
 * Responsabilidades:
 * - Importar dependencias globales (Prisma)
 * - Registrar providers (use cases, repositorio)
 * - Exportar controllers
 */
@Module({
  imports: [PrismaModule],
  controllers: [ArtistsController],
  providers: [
    // Use Cases
    GetArtistUseCase,
    GetArtistsUseCase,
    SearchArtistsUseCase,

    // Repository
    PrismaArtistRepository,

    // Implementación del port
    {
      provide: ARTIST_REPOSITORY,
      useClass: PrismaArtistRepository,
    },
  ],
  exports: [ARTIST_REPOSITORY],
})
export class ArtistsModule {}
