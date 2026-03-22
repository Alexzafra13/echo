import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { AuthModule } from '@features/auth/auth.module';
import { DjModule } from '@features/dj/dj.module';
import { PLAYLIST_REPOSITORY, COLLABORATOR_REPOSITORY } from './domain/ports';
import { DrizzlePlaylistRepository } from './infrastructure/persistence/playlist.repository';
import { DrizzleCollaboratorRepository } from './infrastructure/persistence/collaborator.repository';
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
  GetPlaylistDjShuffledTracksUseCase,
  InviteCollaboratorUseCase,
  AcceptCollaborationUseCase,
  RemoveCollaboratorUseCase,
  GetCollaboratorsUseCase,
  UpdateCollaboratorRoleUseCase,
} from './domain/use-cases';
import { PlaylistsController } from './presentation/controller/playlists.controller';
import { CollaboratorsController } from './presentation/controller/collaborators.controller';

/**
 * PlaylistsModule
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  imports: [TracksModule, AuthModule, DjModule],
  controllers: [PlaylistsController, CollaboratorsController],
  providers: [
    {
      provide: PLAYLIST_REPOSITORY,
      useClass: DrizzlePlaylistRepository,
    },
    {
      provide: COLLABORATOR_REPOSITORY,
      useClass: DrizzleCollaboratorRepository,
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
    GetPlaylistDjShuffledTracksUseCase,
    InviteCollaboratorUseCase,
    AcceptCollaborationUseCase,
    RemoveCollaboratorUseCase,
    GetCollaboratorsUseCase,
    UpdateCollaboratorRoleUseCase,
  ],
  exports: [PLAYLIST_REPOSITORY, COLLABORATOR_REPOSITORY],
})
export class PlaylistsModule {}
