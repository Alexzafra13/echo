import { useState, useRef } from 'react';
import { Upload, X, User, Trash2 } from 'lucide-react';
import { useAuth } from '@shared/hooks';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { useUploadAvatar, useDeleteAvatar } from '../../hooks';
import styles from './AvatarUpload.module.css';

/**
 * AvatarUpload Component
 * Allows users to upload and manage their profile avatar
 */
export function AvatarUpload() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar();
  const { mutate: deleteAvatar, isPending: isDeleting } = useDeleteAvatar();

  const avatarUrl = user?.id ? getUserAvatarUrl(user.id) : null;
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
        // Force image reload by adding timestamp
        window.location.reload();
      },
      onError: (error: any) => {
        setError(error.message || 'Error al subir la imagen');
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
        window.location.reload();
      },
      onError: (error: any) => {
        setError(error.message || 'Error al eliminar el avatar');
      },
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.avatarUpload}>
      <div className={styles.avatarUpload__preview}>
        {/* Avatar Display */}
        <div className={styles.avatarUpload__avatarContainer}>
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
              key={Date.now()} // Force reload on update
            />
          ) : (
            <div className={styles.avatarUpload__avatarPlaceholder}>
              <User size={48} />
            </div>
          )}
        </div>

        {/* User Initials Badge */}
        {!previewUrl && !avatarUrl && (
          <div className={styles.avatarUpload__initials}>
            {initials}
          </div>
        )}
      </div>

      <div className={styles.avatarUpload__controls}>
        {!selectedFile ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className={styles.avatarUpload__input}
            />
            <button
              onClick={openFileDialog}
              className={styles.avatarUpload__button}
              disabled={isUploading || isDeleting}
            >
              <Upload size={18} />
              Subir foto
            </button>
            {avatarUrl && (
              <button
                onClick={handleDelete}
                className={styles.avatarUpload__buttonDelete}
                disabled={isUploading || isDeleting}
              >
                <Trash2 size={18} />
                Eliminar
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleUpload}
              className={styles.avatarUpload__buttonPrimary}
              disabled={isUploading}
            >
              {isUploading ? 'Subiendo...' : 'Guardar'}
            </button>
            <button
              onClick={handleCancel}
              className={styles.avatarUpload__buttonSecondary}
              disabled={isUploading}
            >
              <X size={18} />
              Cancelar
            </button>
          </>
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
