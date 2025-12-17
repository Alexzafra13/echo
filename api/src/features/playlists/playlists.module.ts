import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { AuthModule } from '@features/auth/auth.module';
import { PLAYLIST_REPOSITORY } from './domain/ports';
import { DrizzlePlaylistRepository } from './infrastructure/persistence/playlist.repository';
import {
  CreatePlaylistUseCase,
  GetPlaylistUseCase,
  GetPlaylistsUseCase,
  GetPlaylistsByArtistUseCase,
  UpdatePlaylistUseCase,
  DeletePlaylistUseCase,
  AddTrackToPlaylistUseCase,
  RemoveTrackFromPlaylistUseCase,
  GetPlaylistTracksUseCase,
  ReorderPlaylistTracksUseCase,
} from './domain/use-cases';
import { PlaylistsController } from './presentation/controller/playlists.controller';

/**
 * PlaylistsModule
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  imports: [TracksModule, AuthModule],
  controllers: [PlaylistsController],
  providers: [
    {
      provide: PLAYLIST_REPOSITORY,
      useClass: DrizzlePlaylistRepository,
    },
    CreatePlaylistUseCase,
    GetPlaylistUseCase,
    GetPlaylistsUseCase,
    GetPlaylistsByArtistUseCase,
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
