import { useState, useRef } from 'react';
import { Camera, X, Trash2, Check } from 'lucide-react';
import { useAuthStore } from '@shared/store';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { useUploadAvatar, useDeleteAvatar } from '../../hooks';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './AvatarUpload.module.css';

/**
 * AvatarUpload Component
 * Allows users to upload and manage their profile avatar
 */
export function AvatarUpload() {
  // Use single store subscription to ensure state consistency
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

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      setError('Solo se permiten imágenes JPEG, PNG o WebP');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }

    // Create preview
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
        // Update user state to reflect avatar exists
        updateUser({ hasAvatar: true });
        // Update timestamp to force image reload (cache bust)
        updateAvatarTimestamp();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, 'Error al subir la imagen'));
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
    if (!confirm('¿Estás seguro de que quieres eliminar tu avatar?')) return;

    deleteAvatar(undefined, {
      onSuccess: () => {
        // Update user state to reflect avatar is removed
        updateUser({ hasAvatar: false });
        // Update timestamp to ensure UI refreshes
        updateAvatarTimestamp();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, 'Error al eliminar el avatar'));
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
        <div
          className={styles.avatarUpload__avatarWrapper}
          onClick={openFileDialog}
        >
          {/* Avatar Display */}
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className={styles.avatarUpload__avatar}
            />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name || user?.username}
              className={styles.avatarUpload__avatar}
              onError={handleAvatarError}
              key={avatarTimestamp}
            />
          ) : (
            <div className={styles.avatarUpload__avatarPlaceholder}>
              {initials}
            </div>
          )}

          {/* Hover overlay */}
          {!selectedFile && (
            <div className={styles.avatarUpload__overlay}>
              <Camera size={32} />
              <span>Cambiar foto</span>
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
              title="Guardar"
            >
              <Check size={20} />
            </button>
            <button
              onClick={handleCancel}
              className={styles.avatarUpload__actionCancel}
              disabled={isUploading}
              title="Cancelar"
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
            title="Eliminar avatar"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Helper text */}
      <p className={styles.avatarUpload__helper}>
        JPG, PNG o WebP. Máximo 5MB.
      </p>

      {/* Error message */}
      {error && (
        <div className={styles.avatarUpload__error}>
          {error}
        </div>
      )}
    </div>
  );
}
