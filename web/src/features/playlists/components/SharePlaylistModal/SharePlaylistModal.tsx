import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Search, Shield, Eye, Edit3, X, Crown, Clock, Check } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { useAuthStore } from '@shared/store';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import {
  usePlaylistCollaborators,
  useInviteCollaborator,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
} from '../../hooks/usePlaylists';
import { useUserSearch } from '../../hooks/useUserSearch';
import type { Playlist, CollaboratorRole, PlaylistCollaborator } from '../../types';
import styles from './SharePlaylistModal.module.css';

interface SharePlaylistModalProps {
  playlist: Playlist;
  onClose: () => void;
}

export function SharePlaylistModal({ playlist, onClose }: SharePlaylistModalProps) {
  const { t } = useTranslation();
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

  // IDs to exclude (owner + existing collaborators)
  const existingIds = useMemo(
    () => new Set([playlist.ownerId, ...collaborators.map((c) => c.userId)]),
    [playlist.ownerId, collaborators]
  );

  // User search (extracted hook)
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    suggestions,
    isSearching,
    isFocused,
    setIsFocused,
    clearSearch,
  } = useUserSearch({ excludeIds: existingIds, collaboratorsCount: collaborators.length });

  // UI state
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleInvite = useCallback(
    async (userId: string) => {
      setError('');
      try {
        await inviteMutation.mutateAsync({
          playlistId: playlist.id,
          dto: { userId, role: inviteRole },
        });
        clearSearch();
        setSuccessMessage(t('playlists.inviteSuccess'));
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError(getApiErrorMessage(err, t('playlists.inviteError')));
      }
    },
    [inviteMutation, playlist.id, inviteRole, clearSearch, t]
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
        setError(getApiErrorMessage(err, t('playlists.changeRoleError')));
      }
    },
    [updateRoleMutation, playlist.id, t]
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
        setError(getApiErrorMessage(err, t('playlists.removeCollaboratorError')));
      }
    },
    [removeMutation, playlist.id, t]
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('playlists.shareTitle')}
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
                placeholder={t('playlists.searchUsersPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                autoFocus
              />
              {searchQuery && (
                <button className={styles.searchClear} onClick={clearSearch} type="button">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Role selector for invite */}
            <div className={styles.roleSelector}>
              <span className={styles.roleSelectorLabel}>{t('playlists.inviteAs')}</span>
              <div className={styles.roleButtons}>
                <button
                  className={`${styles.roleButton} ${inviteRole === 'viewer' ? styles['roleButton--active'] : ''}`}
                  onClick={() => setInviteRole('viewer')}
                  type="button"
                >
                  <Eye size={14} />
                  {t('playlists.roleViewer')}
                </button>
                <button
                  className={`${styles.roleButton} ${inviteRole === 'editor' ? styles['roleButton--active'] : ''}`}
                  onClick={() => setInviteRole('editor')}
                  type="button"
                >
                  <Edit3 size={14} />
                  {t('playlists.roleEditor')}
                </button>
              </div>
            </div>

            {/* Search results */}
            {searchQuery.trim() && (
              <div className={styles.searchResults}>
                {isSearching ? (
                  <div className={styles.searchLoading}>{t('playlists.searching')}</div>
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
                        {t('playlists.invite')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className={styles.searchEmpty}>{t('playlists.noUsersFound')}</div>
                )}
              </div>
            )}

            {/* Sugerencias de amigos cuando no hay búsqueda activa */}
            {!searchQuery.trim() && isFocused && suggestions.length > 0 && (
              <div className={styles.searchResults}>
                <div className={styles.suggestionsHeader}>{t('playlists.friends')}</div>
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
                      {t('playlists.invite')}
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
            {t('playlists.peopleWithAccess')}
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
                  {playlist.ownerName || t('playlists.owner')}
                  {currentUser?.id === playlist.ownerId && (
                    <span className={styles.youBadge}>{t('playlists.youBadge')}</span>
                  )}
                </span>
                <span className={styles.userRole}>
                  <Crown size={12} />
                  {t('playlists.owner')}
                </span>
              </div>
            </div>

            {/* Loading state */}
            {loadingCollabs && (
              <div className={styles.loadingState}>{t('playlists.loadingCollaborators')}</div>
            )}

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
                      <span className={styles.youBadge}>{t('playlists.youBadge')}</span>
                    )}
                  </span>
                  <span className={styles.userHandle}>@{collab.username}</span>
                </div>

                {/* Status badge for pending */}
                {collab.status === 'pending' && (
                  <span className={styles.pendingBadge}>
                    <Clock size={12} />
                    {t('playlists.pendingStatus')}
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
                      <option value="viewer">{t('playlists.roleViewer')}</option>
                      <option value="editor">{t('playlists.roleEditor')}</option>
                    </select>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemove(collab)}
                      disabled={removeMutation.isPending}
                      title={t('playlists.removeCollaboratorTitle')}
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
                        {t('playlists.roleEditor')}
                      </>
                    ) : (
                      <>
                        <Eye size={12} />
                        {t('playlists.roleViewer')}
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
                <p>{t('playlists.noOneElseHasAccess')}</p>
                {isOwner && <p className={styles.emptyHint}>{t('playlists.inviteHint')}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
