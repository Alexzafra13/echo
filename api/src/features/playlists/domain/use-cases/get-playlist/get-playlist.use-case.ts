import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { IUserRepository, USER_REPOSITORY } from '@features/auth/domain/ports/user-repository.port';
import { GetPlaylistInput, GetPlaylistOutput } from './get-playlist.dto';

@Injectable()
export class GetPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: GetPlaylistInput): Promise<GetPlaylistOutput> {
    // 1. Validar input
    if (!input.id || input.id.trim() === '') {
      throw new ValidationError('Playlist ID is required');
    }

    // 2. Buscar playlist
    const playlist = await this.playlistRepository.findById(input.id);

    if (!playlist) {
      throw new NotFoundError('Playlist', input.id);
    }

    // 3. Verificar acceso: playlist pública O usuario es el dueño
    const isOwner = input.requesterId && playlist.ownerId === input.requesterId;
    if (!playlist.public && !isOwner) {
      throw new ForbiddenError('No tienes acceso a esta playlist');
    }

    // 4. Obtener información del usuario owner (name/username y hasAvatar)
    const owner = await this.userRepository.findById(playlist.ownerId);
    const ownerName = owner?.name || owner?.username;
    const ownerHasAvatar = owner?.avatarPath ? true : false;

    // 4. Retornar output
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverImageUrl: playlist.coverImageUrl,
      duration: playlist.duration,
      size: playlist.size,
      ownerId: playlist.ownerId,
      ownerName,
      ownerHasAvatar,
      public: playlist.public,
      songCount: playlist.songCount,
      path: playlist.path,
      sync: playlist.sync,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }
}
