import { ForbiddenError } from '@shared/errors';
import { Playlist } from '../entities';
import { ICollaboratorRepository } from '../ports';

/**
 * Verifica que el usuario puede ver la playlist:
 * pública, propietario, o colaborador aceptado (cualquier rol).
 */
export async function assertCanViewPlaylist(
  playlist: Playlist,
  requesterId: string | undefined,
  collaboratorRepository: ICollaboratorRepository
): Promise<void> {
  if (playlist.public) return;

  const isOwner = requesterId && playlist.ownerId === requesterId;
  if (isOwner) return;

  const isCollaborator = requesterId
    ? await collaboratorRepository.isCollaborator(playlist.id, requesterId)
    : false;
  if (!isCollaborator) {
    throw new ForbiddenError('You do not have access to this playlist');
  }
}

/**
 * Verifica que el usuario puede editar la playlist (propietario o editor colaborador).
 */
export async function assertCanEditPlaylist(
  playlist: Playlist,
  userId: string,
  collaboratorRepository: ICollaboratorRepository
): Promise<void> {
  const isOwner = playlist.ownerId === userId;
  if (isOwner) return;

  const isEditor = await collaboratorRepository.isEditor(playlist.id, userId);
  if (!isEditor) {
    throw new ForbiddenError('You do not have permission to modify this playlist');
  }
}
