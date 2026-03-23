import { useState, useCallback, useRef, useEffect } from 'react';
import { Users, UserPlus, Search, Shield, Eye, Edit3, X, Crown, Clock, Check } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { useAuthStore } from '@shared/store';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import {
  searchUsers,
  getFriends,
  type SearchUserResult,
} from '@features/social/services/social.service';
import {
  usePlaylistCollaborators,
  useInviteCollaborator,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
} from '../../hooks/usePlaylists';
import type { Playlist, CollaboratorRole, PlaylistCollaborator } from '../../types';
import styles from './SharePlaylistModal.module.css';

interface SharePlaylistModalProps {
  playlist: Playlist;
  onClose: () => void;
}

export function SharePlaylistModal({ playlist, onClose }: SharePlaylistModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);
  const isOwner = currentUser?.id === playlist.ownerId;

  // Collaborators data
  const { data: collabData, isLoading: loadingCollabs } = usePlaylistCollaborators(playlist.id);
  const collaborators = collabData?.collaborators ?? [];

  // Mutations
  const inviteMutation = useInviteCollaborator();
  const updateRoleMutation = useUpdateCollaboratorRole();
  const removeMutation = useRemoveCollaborator();

  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // IDs a excluir (owner + colaboradores existentes)
  const existingIds = new Set([playlist.ownerId, ...collaborators.map((c) => c.userId)]);

  // Cargar amigos como sugerencias al abrir el modal
  useEffect(() => {
    getFriends()
      .then((friends) => {
        const available = friends
          .filter((f) => !existingIds.has(f.id))
          .map((f) => ({
            id: f.id,
            username: f.username,
            name: f.name,
            avatarUrl: f.avatarUrl,
            friendshipStatus: 'accepted' as const,
          }));
        setSuggestions(available);
      })
      .catch(() => setSuggestions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborators.length]);

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results: SearchUserResult[] = await searchUsers(searchQuery, 8);
        // Filter out owner and existing collaborators
        const existingIds = new Set([playlist.ownerId, ...collaborators.map((c) => c.userId)]);
        const filtered: SearchUserResult[] = results.filter((u) => !existingIds.has(u.id));
        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery, playlist.ownerId, collaborators]);

  const handleInvite = useCallback(
    async (userId: string) => {
      setError('');
      try {
        await inviteMutation.mutateAsync({
          playlistId: playlist.id,
          dto: { userId, role: inviteRole },
        });
        setSearchQuery('');
        setSearchResults([]);
        setSuccessMessage('Invitacion enviada');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Error al invitar usuario'));
      }
    },
    [inviteMutation, playlist.id, inviteRole]
  );

  const handleRoleChange = useCallback(
    async (collab: PlaylistCollaborator, newRole: CollaboratorRole) => {
      setError('');
      try {
        await updateRoleMutation.mutateAsync({
          playlistId: playlist.id,
          userId: collab.userId,
          dto: { role: newRole },
        });
      } catch (err) {
        setError(getApiErrorMessage(err, 'Error al cambiar rol'));
      }
    },
    [updateRoleMutation, playlist.id]
  );

  const handleRemove = useCallback(
    async (collab: PlaylistCollaborator) => {
      setError('');
      try {
        await removeMutation.mutateAsync({
          playlistId: playlist.id,
          userId: collab.userId,
        });
      } catch (err) {
        setError(getApiErrorMessage(err, 'Error al eliminar colaborador'));
      }
    },
    [removeMutation, playlist.id]
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Compartir Playlist"
      icon={Users}
      subtitle={playlist.name}
      width="480px"
    >
      <div className={styles.content}>
        {/* Invite section - only for owner */}
        {isOwner && (
          <div className={styles.inviteSection}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar usuarios por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                autoFocus
              />
              {searchQuery && (
                <button
                  className={styles.searchClear}
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Role selector for invite */}
            <div className={styles.roleSelector}>
              <span className={styles.roleSelectorLabel}>Invitar como:</span>
              <div className={styles.roleButtons}>
                <button
                  className={`${styles.roleButton} ${inviteRole === 'viewer' ? styles['roleButton--active'] : ''}`}
                  onClick={() => setInviteRole('viewer')}
                  type="button"
                >
                  <Eye size={14} />
                  Lector
                </button>
                <button
                  className={`${styles.roleButton} ${inviteRole === 'editor' ? styles['roleButton--active'] : ''}`}
                  onClick={() => setInviteRole('editor')}
                  type="button"
                >
                  <Edit3 size={14} />
                  Editor
                </button>
              </div>
            </div>

            {/* Search results */}
            {searchQuery.trim() && (
              <div className={styles.searchResults}>
                {isSearching ? (
                  <div className={styles.searchLoading}>Buscando...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div key={user.id} className={styles.searchResultItem}>
                      <img
                        src={getUserAvatarUrl(user.id, !!user.avatarUrl, avatarTimestamp)}
                        alt={user.username}
                        className={styles.avatar}
                        onError={handleAvatarError}
                      />
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.name || user.username}</span>
                        <span className={styles.userHandle}>@{user.username}</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleInvite(user.id)}
                        disabled={inviteMutation.isPending}
                        leftIcon={<UserPlus size={14} />}
                      >
                        Invitar
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className={styles.searchEmpty}>No se encontraron usuarios</div>
                )}
              </div>
            )}

            {/* Sugerencias de amigos cuando no hay búsqueda activa */}
            {!searchQuery.trim() && isFocused && suggestions.length > 0 && (
              <div className={styles.searchResults}>
                <div className={styles.suggestionsHeader}>Amigos</div>
                {suggestions.slice(0, 5).map((user) => (
                  <div key={user.id} className={styles.searchResultItem}>
                    <img
                      src={getUserAvatarUrl(user.id, !!user.avatarUrl, avatarTimestamp)}
                      alt={user.username}
                      className={styles.avatar}
                      onError={handleAvatarError}
                    />
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{user.name || user.username}</span>
                      <span className={styles.userHandle}>@{user.username}</span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInvite(user.id)}
                      disabled={inviteMutation.isPending}
                      leftIcon={<UserPlus size={14} />}
                    >
                      Invitar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Success/Error messages */}
        {successMessage && (
          <div className={styles.successMessage}>
            <Check size={14} />
            {successMessage}
          </div>
        )}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Collaborators list */}
        <div className={styles.collaboratorsSection}>
          <h3 className={styles.sectionTitle}>
            <Shield size={16} />
            Personas con acceso
          </h3>

          <div className={styles.collaboratorsList}>
            {/* Owner - always first */}
            <div className={styles.collaboratorItem}>
              <img
                src={getUserAvatarUrl(playlist.ownerId, true, avatarTimestamp)}
                alt={playlist.ownerName || 'Owner'}
                className={styles.avatar}
                onError={handleAvatarError}
              />
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {playlist.ownerName || 'Propietario'}
                  {currentUser?.id === playlist.ownerId && (
                    <span className={styles.youBadge}>(tu)</span>
                  )}
                </span>
                <span className={styles.userRole}>
                  <Crown size={12} />
                  Propietario
                </span>
              </div>
            </div>

            {/* Loading state */}
            {loadingCollabs && <div className={styles.loadingState}>Cargando colaboradores...</div>}

            {/* Collaborators */}
            {collaborators.map((collab) => (
              <div key={collab.id} className={styles.collaboratorItem}>
                <img
                  src={getUserAvatarUrl(collab.userId, collab.hasAvatar, avatarTimestamp)}
                  alt={collab.username}
                  className={styles.avatar}
                  onError={handleAvatarError}
                />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {collab.name || collab.username}
                    {currentUser?.id === collab.userId && (
                      <span className={styles.youBadge}>(tu)</span>
                    )}
                  </span>
                  <span className={styles.userHandle}>@{collab.username}</span>
                </div>

                {/* Status badge for pending */}
                {collab.status === 'pending' && (
                  <span className={styles.pendingBadge}>
                    <Clock size={12} />
                    Pendiente
                  </span>
                )}

                {/* Role + actions for owner */}
                {isOwner ? (
                  <div className={styles.collaboratorActions}>
                    <select
                      className={styles.roleSelect}
                      value={collab.role}
                      onChange={(e) => handleRoleChange(collab, e.target.value as CollaboratorRole)}
                      disabled={updateRoleMutation.isPending}
                    >
                      <option value="viewer">Lector</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemove(collab)}
                      disabled={removeMutation.isPending}
                      title="Eliminar colaborador"
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <span className={styles.roleBadge}>
                    {collab.role === 'editor' ? (
                      <>
                        <Edit3 size={12} />
                        Editor
                      </>
                    ) : (
                      <>
                        <Eye size={12} />
                        Lector
                      </>
                    )}
                  </span>
                )}
              </div>
            ))}

            {/* Empty state */}
            {!loadingCollabs && collaborators.length === 0 && (
              <div className={styles.emptyState}>
                <UserPlus size={24} />
                <p>Nadie mas tiene acceso a esta playlist</p>
                {isOwner && (
                  <p className={styles.emptyHint}>Busca usuarios arriba para invitarlos</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
