import { useState } from 'react';
import { useLocation } from 'wouter';
import { MoreHorizontal, Edit2, ListPlus, Copy, Share2, Trash2, Globe, Lock } from 'lucide-react';
import { useDropdownMenu } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import { DeletePlaylistModal } from '../DeletePlaylistModal';
import { EditPlaylistModal } from '../EditPlaylistModal';
import type { Playlist, UpdatePlaylistDto } from '../../types';
import styles from './PlaylistOptionsMenu.module.css';

interface PlaylistOptionsMenuProps {
  playlist: Playlist;
  tracks?: { id: string }[];
  onAddToQueue?: () => void;
  onDuplicate?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onUpdate?: (id: string, dto: UpdatePlaylistDto) => Promise<void>;
  isOwner?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

/**
 * PlaylistOptionsMenu Component
 * Unified dropdown menu with all playlist options
 */
export function PlaylistOptionsMenu({
  playlist,
  tracks,
  onAddToQueue,
  onDuplicate,
  onDelete,
  onUpdate,
  isOwner = true,
  isUpdating = false,
  isDeleting = false,
}: PlaylistOptionsMenuProps) {
  const [, setLocation] = useLocation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const {
    isOpen,
    isClosing,
    triggerRef,
    dropdownRef,
    effectivePosition,
    toggleMenu,
    handleOptionClick,
  } = useDropdownMenu({ offset: 8 });

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleAddToQueue = () => {
    onAddToQueue?.();
  };

  const handleDuplicate = async () => {
    await onDuplicate?.();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/playlist/${playlist.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleToggleVisibility = async () => {
    if (onUpdate) {
      await onUpdate(playlist.id, { public: !playlist.public });
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    await onDelete?.();
    setLocation('/playlists');
  };

  const handleUpdatePlaylist = async (id: string, dto: UpdatePlaylistDto) => {
    if (onUpdate) {
      await onUpdate(id, dto);
    }
    setShowEditModal(false);
  };

  const hasTracks = tracks && tracks.length > 0;

  return (
    <>
      <div className={styles.playlistOptionsMenu}>
        <button
          ref={triggerRef}
          className={styles.playlistOptionsMenu__trigger}
          onClick={toggleMenu}
          aria-label="Opciones de la playlist"
          aria-expanded={isOpen}
          title="Opciones"
        >
          <MoreHorizontal size={24} />
        </button>
      </div>

      {isOpen && effectivePosition && (
        <Portal>
          <div
            ref={dropdownRef}
            className={`${styles.playlistOptionsMenu__dropdown} ${isClosing ? styles['playlistOptionsMenu__dropdown--closing'] : ''}`}
            style={{
              position: 'fixed',
              top: effectivePosition.top !== undefined ? `${effectivePosition.top}px` : undefined,
              bottom: effectivePosition.bottom !== undefined ? `${effectivePosition.bottom}px` : undefined,
              right: effectivePosition.right !== undefined ? `${effectivePosition.right}px` : undefined,
              left: effectivePosition.left !== undefined ? `${effectivePosition.left}px` : undefined,
              maxHeight: `${effectivePosition.maxHeight}px`,
              pointerEvents: isClosing ? 'none' : 'auto',
            }}
            data-placement={effectivePosition.placement}
          >
            {/* Edit - solo para el dueño */}
            {isOwner && onUpdate && (
              <button
                className={styles.playlistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, handleEdit)}
              >
                <Edit2 size={16} />
                <span>Editar</span>
              </button>
            )}

            {/* Add to queue */}
            {hasTracks && onAddToQueue && (
              <button
                className={styles.playlistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, handleAddToQueue)}
              >
                <ListPlus size={16} />
                <span>Añadir a cola</span>
              </button>
            )}

            {/* Duplicate */}
            {onDuplicate && (
              <button
                className={styles.playlistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, handleDuplicate)}
              >
                <Copy size={16} />
                <span>Duplicar playlist</span>
              </button>
            )}

            {/* Share / Copy link */}
            {playlist.public && (
              <button
                className={styles.playlistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, handleShare)}
              >
                <Share2 size={16} />
                <span>{copySuccess ? '¡Enlace copiado!' : 'Copiar enlace'}</span>
              </button>
            )}

            {/* Toggle visibility - solo para el dueño */}
            {isOwner && onUpdate && (
              <>
                <div className={styles.playlistOptionsMenu__separator} />
                <button
                  className={styles.playlistOptionsMenu__option}
                  onClick={(e) => handleOptionClick(e, handleToggleVisibility)}
                  disabled={isUpdating}
                >
                  {playlist.public ? <Lock size={16} /> : <Globe size={16} />}
                  <span>{playlist.public ? 'Hacer privada' : 'Hacer pública'}</span>
                </button>
              </>
            )}

            {/* Delete - solo para el dueño */}
            {isOwner && onDelete && (
              <>
                <div className={styles.playlistOptionsMenu__separator} />
                <button
                  className={`${styles.playlistOptionsMenu__option} ${styles['playlistOptionsMenu__option--danger']}`}
                  onClick={(e) => handleOptionClick(e, handleDelete)}
                >
                  <Trash2 size={16} />
                  <span>Eliminar playlist</span>
                </button>
              </>
            )}
          </div>
        </Portal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditPlaylistModal
          playlist={playlist}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdatePlaylist}
          isLoading={isUpdating}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeletePlaylistModal
          playlistName={playlist.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
