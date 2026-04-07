import { useState, useRef } from 'react';
import { Camera, X, Trash2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@shared/store';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { useUploadAvatar, useDeleteAvatar } from '../../hooks';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './AvatarUpload.module.css';

/**
 * AvatarUpload Component
 * Permite subir y gestionar el avatar de perfil del usuario
 */
export function AvatarUpload() {
  const { t } = useTranslation();
  // Suscripción única al store para asegurar consistencia de estado
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);
  const updateAvatarTimestamp = useAuthStore((state) => state.updateAvatarTimestamp);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar();
  const { mutate: deleteAvatar, isPending: isDeleting } = useDeleteAvatar();

  const avatarUrl = getUserAvatarUrl(user?.id, user?.hasAvatar, avatarTimestamp);
  const initials = getUserInitials(user?.name, user?.username);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validar tipo de archivo
    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      setError(t('profile.avatar.invalidFormat'));
      return;
    }

    // Validar tamaño de archivo (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('profile.avatar.fileTooLarge'));
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    uploadAvatar(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Actualizar estado del usuario para reflejar que existe avatar
        updateUser({ hasAvatar: true });
        // Actualizar timestamp para forzar recarga de imagen (cache bust)
        updateAvatarTimestamp();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, t('profile.avatar.uploadingButton')));
      },
    });
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = () => {
    if (!confirm(t('profile.avatar.deleteConfirmation'))) return;

    deleteAvatar(undefined, {
      onSuccess: () => {
        // Actualizar estado del usuario para reflejar que se eliminó el avatar
        updateUser({ hasAvatar: false });
        // Actualizar timestamp para refrescar la UI
        updateAvatarTimestamp();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, t('profile.avatar.deleteTitle')));
      },
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.avatarUpload}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className={styles.avatarUpload__input}
      />

      {/* Avatar with hover overlay */}
      <div className={styles.avatarUpload__container}>
        <div className={styles.avatarUpload__avatarWrapper} onClick={openFileDialog}>
          {/* Avatar Display */}
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className={styles.avatarUpload__avatar} />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name || user?.username}
              className={styles.avatarUpload__avatar}
              onError={handleAvatarError}
              key={avatarTimestamp}
            />
          ) : (
            <div className={styles.avatarUpload__avatarPlaceholder}>{initials}</div>
          )}

          {/* Hover overlay */}
          {!selectedFile && (
            <div className={styles.avatarUpload__overlay}>
              <Camera size={32} />
              <span>{t('profile.avatar.changePhotoText')}</span>
            </div>
          )}
        </div>

        {/* Action buttons when file is selected */}
        {selectedFile && (
          <div className={styles.avatarUpload__actions}>
            <button
              onClick={handleUpload}
              className={styles.avatarUpload__actionButton}
              disabled={isUploading}
              title={t('common.save')}
            >
              <Check size={20} />
            </button>
            <button
              onClick={handleCancel}
              className={styles.avatarUpload__actionCancel}
              disabled={isUploading}
              title={t('common.cancel')}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Delete button - only show if user has avatar and no file selected */}
        {user?.hasAvatar && !selectedFile && (
          <button
            onClick={handleDelete}
            className={styles.avatarUpload__deleteButton}
            disabled={isDeleting}
            title={t('profile.avatar.deleteTitle')}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Helper text */}
      <p className={styles.avatarUpload__helper}>{t('profile.avatar.helperText')}</p>

      {/* Error message */}
      {error && <div className={styles.avatarUpload__error}>{error}</div>}
    </div>
  );
}
