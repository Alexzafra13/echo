import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { AlbumsController } from './presentation/controller/albums.controller';
import { GetAlbumUseCase, GetAlbumsUseCase, SearchAlbumsUseCase } from './domain/use-cases';
import { PrismaAlbumRepository } from './infrastructure/persistence/album.repository';
import { ALBUM_REPOSITORY } from './domain/ports/album-repository.port';

/**
 * AlbumsModule - Módulo de gestión de álbumes
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
  controllers: [AlbumsController],
  providers: [
    // Use Cases
    GetAlbumUseCase,
    GetAlbumsUseCase,
    SearchAlbumsUseCase,

    // Repository
    PrismaAlbumRepository,

    // Implementación del port
    {
      provide: ALBUM_REPOSITORY,
      useClass: PrismaAlbumRepository,
    },
  ],
  exports: [ALBUM_REPOSITORY],
})
export class AlbumsModule {}