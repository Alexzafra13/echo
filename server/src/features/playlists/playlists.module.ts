import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { TracksModule } from '@features/tracks/tracks.module';
import { AuthModule } from '@features/auth/auth.module';
import { PLAYLIST_REPOSITORY } from './domain/ports';
import { PrismaPlaylistRepository } from './infrastructure/persistence/playlist.repository';
import {
  CreatePlaylistUseCase,
  GetPlaylistUseCase,
  GetPlaylistsUseCase,
  UpdatePlaylistUseCase,
  DeletePlaylistUseCase,
  AddTrackToPlaylistUseCase,
  RemoveTrackFromPlaylistUseCase,
  GetPlaylistTracksUseCase,
  ReorderPlaylistTracksUseCase,
} from './domain/use-cases';
import { PlaylistsController } from './presentation/controller/playlists.controller';

@Module({
  imports: [TracksModule, AuthModule],
  controllers: [PlaylistsController],
  providers: [
    PrismaService,
    {
      provide: PLAYLIST_REPOSITORY,
      useClass: PrismaPlaylistRepository,
    },
    CreatePlaylistUseCase,
    GetPlaylistUseCase,
    GetPlaylistsUseCase,
    UpdatePlaylistUseCase,
    DeletePlaylistUseCase,
    AddTrackToPlaylistUseCase,
    RemoveTrackFromPlaylistUseCase,
    GetPlaylistTracksUseCase,
    ReorderPlaylistTracksUseCase,
  ],
  exports: [PLAYLIST_REPOSITORY],
})
export class PlaylistsModule {}
