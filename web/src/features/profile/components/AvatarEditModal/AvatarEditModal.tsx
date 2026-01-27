import { useState } from 'react';
import { X, Upload, Trash2, } from 'lucide-react';
import { useAuth, useFileUpload } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { useUploadAvatar, useDeleteAvatar } from '../../hooks';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './AvatarEditModal.module.css';

interface AvatarEditModalProps {
  onClose: () => void;
}

/**
 * AvatarEditModal Component
 * Modal for editing user avatar - upload or delete
 */
export function AvatarEditModal({ onClose }: AvatarEditModalProps) {
  const { user } = useAuth();
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);
  const updateAvatarTimestamp = useAuthStore((state) => state.updateAvatarTimestamp);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use shared file upload hook for validation and preview
  const {
    selectedFile,
    previewUrl,
    error,
    setError,
    handleFileSelect,
    resetInput,
    fileInputRef,
  } = useFileUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  });

  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar();
  const { mutate: deleteAvatar, isPending: isDeleting } = useDeleteAvatar();

  const avatarUrl = user?.id && user?.hasAvatar ? getUserAvatarUrl(user.id, user.hasAvatar, avatarTimestamp) : null;
  const initials = getUserInitials(user?.name, user?.username);

  const handleUpload = () => {
    if (!selectedFile) return;

    uploadAvatar(selectedFile, {
      onSuccess: () => {
        // Actualizar el flag hasAvatar en el store para que Header y otros componentes lo vean
        updateUser({ hasAvatar: true });
        // Actualizar timestamp global para que todos los componentes recarguen el avatar
        updateAvatarTimestamp();
        // Limpiar preview y archivo seleccionado
        resetInput();
        // Cerrar modal
        onClose();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, 'Error al subir la imagen'));
      },
    });
  };

  const handleDelete = () => {
    deleteAvatar(undefined, {
      onSuccess: () => {
        // Actualizar el flag hasAvatar en el store para que Header y otros componentes lo vean
        updateUser({ hasAvatar: false });
        // Actualizar timestamp global para que todos los componentes recarguen el avatar
        updateAvatarTimestamp();
        // Cerrar confirmación y modal
        setShowDeleteConfirm(false);
        onClose();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, 'Error al eliminar el avatar'));
        setShowDeleteConfirm(false);
      },
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modal__header}>
          <h2>Foto de perfil</h2>
          <button onClick={onClose} className={styles.modal__closeButton}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modal__body}>
          {/* Avatar Preview */}
          <div className={styles.modal__avatarPreview}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className={styles.modal__avatar}
              />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name || user?.username}
                className={styles.modal__avatar}
                onError={handleAvatarError}
              />
            ) : (
              <div className={styles.modal__avatarPlaceholder}>
                {initials}
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className={styles.modal__fileInput}
          />

          {/* Actions */}
          {!selectedFile ? (
            <div className={styles.modal__actions}>
              <button
                onClick={openFileDialog}
                className={styles.modal__button}
                disabled={isUploading || isDeleting}
              >
                <Upload size={20} />
                Subir nueva foto
              </button>
              {avatarUrl && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={styles.modal__buttonDanger}
                  disabled={isUploading || isDeleting}
                >
                  <Trash2 size={20} />
                  Eliminar foto
                </button>
              )}
            </div>
          ) : (
            <div className={styles.modal__actions}>
              <button
                onClick={handleUpload}
                className={styles.modal__buttonPrimary}
                disabled={isUploading}
              >
                {isUploading ? 'Subiendo...' : 'Guardar cambios'}
              </button>
              <button
                onClick={resetInput}
                className={styles.modal__buttonSecondary}
                disabled={isUploading}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Info */}
          <p className={styles.modal__info}>
            Formatos permitidos: JPG, PNG, WebP<br />
            Tamaño máximo: 5MB
          </p>

          {/* Error message */}
          {error && (
            <div className={styles.modal__error}>
              {error}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className={styles.modal__confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div className={styles.modal__confirmBox} onClick={(e) => e.stopPropagation()}>
              <h3>¿Eliminar foto de perfil?</h3>
              <p>Esta acción no se puede deshacer</p>
              <div className={styles.modal__confirmActions}>
                <button
                  onClick={handleDelete}
                  className={styles.modal__buttonDanger}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={styles.modal__buttonSecondary}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
