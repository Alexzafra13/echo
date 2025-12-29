import { useState } from 'react';
import { Upload, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useFileUpload } from '@shared/hooks/useFileUpload';
import { formatFileSize } from '@shared/utils/format';
import {
  useUploadCustomImage,
  useListCustomImages,
  useApplyCustomImage,
  useDeleteCustomImage,
} from '../../hooks/useArtistAvatars';
import { CustomImage, AvatarImageType } from '../../api/artist-avatars.api';
import styles from './FileUploadSection.module.css';

interface FileUploadSectionProps {
  artistId: string;
  imageType: AvatarImageType;
  onSuccess?: () => void;
}

/**
 * FileUploadSection Component
 * Permite subir imágenes personalizadas desde el PC
 */
export function FileUploadSection({ artistId, imageType, onSuccess }: FileUploadSectionProps) {
  const [selectedCustomImage, setSelectedCustomImage] = useState<CustomImage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Hook para manejo de archivos
  const {
    selectedFile,
    previewUrl,
    error: fileError,
    handleFileSelect,
    resetInput,
    fileInputRef,
  } = useFileUpload({
    onError: setUploadError,
  });

  const { mutate: uploadImage, isPending: isUploading } = useUploadCustomImage();
  const { data: customImagesData, isLoading: isLoadingCustomImages } = useListCustomImages(artistId);
  const { mutate: applyImage, isPending: isApplying } = useApplyCustomImage();
  const { mutate: deleteImage, isPending: isDeleting } = useDeleteCustomImage();

  // Filtrar imágenes por tipo
  const customImages = (customImagesData?.customImages || []).filter((img) => img.imageType === imageType);

  // Combinar errores del hook y de upload
  const displayError = uploadError || fileError;

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploadError(null);
    uploadImage(
      {
        artistId,
        imageType,
        file: selectedFile,
      },
      {
        onSuccess: (data) => {
          // Aplicar automáticamente la imagen recién subida
          applyImage(
            {
              artistId,
              customImageId: data.customImageId,
            },
            {
              onSuccess: () => {
                resetInput();
                onSuccess?.();
              },
              onError: (error: any) => {
                if (import.meta.env.DEV) {
                  console.error('[FileUpload] ❌ Apply error:', error);
                }
                setUploadError(error?.response?.data?.message || 'Error al aplicar la imagen');
                resetInput();
              },
            }
          );
        },
        onError: (error: any) => {
          if (import.meta.env.DEV) {
            console.error('[FileUpload] ❌ Upload error:', error);
          }
          setUploadError(error?.response?.data?.message || 'Error al subir la imagen');
        },
      }
    );
  };

  const handleCancel = () => {
    resetInput();
    setUploadError(null);
  };

  const handleApplyCustomImage = (image: CustomImage) => {
    applyImage(
      {
        artistId,
        customImageId: image.id,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (error: any) => {
          if (import.meta.env.DEV) {
            console.error('[FileUpload] ❌ Apply error:', error);
          }
          setUploadError(error?.response?.data?.message || 'Error al aplicar la imagen');
        },
      }
    );
  };

  const handleDeleteCustomImage = (image: CustomImage, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`¿Estás seguro de eliminar esta imagen personalizada?`)) {
      return;
    }

    deleteImage(
      {
        artistId,
        customImageId: image.id,
      },
      {
        onSuccess: () => {
          if (selectedCustomImage?.id === image.id) {
            setSelectedCustomImage(null);
          }
        },
        onError: (error: any) => {
          if (import.meta.env.DEV) {
            console.error('[FileUpload] ❌ Delete error:', error);
          }
          setUploadError(error?.response?.data?.message || 'Error al eliminar la imagen');
        },
      }
    );
  };

  // Utility function for future use
  // const getTypeLabel = (type: string) => {
  //   const labels: Record<string, string> = {
  //     profile: 'Perfil',
  //     background: 'Fondo',
  //     banner: 'Banner',
  //     logo: 'Logo',
  //   };
  //   return labels[type] || type;
  // };

  return (
    <div className={styles.container}>
      {/* Upload Section */}
      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>Subir desde tu PC</h3>

        {!selectedFile ? (
          <div className={styles.uploadBox}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className={styles.fileInput}
              id="fileInput"
            />
            <label htmlFor="fileInput" className={styles.uploadLabel}>
              <Upload size={48} className={styles.uploadIcon} />
              <p className={styles.uploadText}>
                Haz clic para seleccionar una imagen
              </p>
              <span className={styles.uploadHint}>
                JPEG, PNG o WebP (máx. 10MB)
              </span>
            </label>
          </div>
        ) : (
          <div className={styles.previewContainer}>
            <div className={styles.previewHeader}>
              <span className={styles.previewTitle}>Vista previa</span>
              <button onClick={handleCancel} className={styles.cancelButton}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.previewImageWrapper}>
              <img
                src={previewUrl || ''}
                alt="Preview"
                className={styles.previewImage}
              />
            </div>

            <div className={styles.fileInfo}>
              <p className={styles.fileName}>{selectedFile.name}</p>
              <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={handleUpload}
              disabled={isUploading || isApplying}
              loading={isUploading || isApplying}
            >
              {isUploading ? 'Subiendo...' : isApplying ? 'Aplicando...' : 'Subir y aplicar'}
            </Button>
          </div>
        )}

        {displayError && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{displayError}</span>
          </div>
        )}
      </div>

      {/* Custom Images List */}
      {customImages.length > 0 && (
        <div className={styles.customImagesSection}>
          <h3 className={styles.sectionTitle}>
            Imágenes subidas ({customImages.length})
          </h3>

          <div className={styles.customImagesGrid}>
            {customImages.map((image) => (
              <div
                key={image.id}
                className={`${styles.customImageCard} ${
                  selectedCustomImage?.id === image.id ? styles.customImageCardSelected : ''
                } ${image.isActive ? styles.customImageCardActive : ''}`}
                onClick={() => setSelectedCustomImage(image)}
              >
                {selectedCustomImage?.id === image.id && (
                  <div className={styles.selectedBadge}>
                    <Check size={20} />
                  </div>
                )}

                {image.isActive && (
                  <div className={styles.activeBadge}>
                    Activa
                  </div>
                )}

                <div className={styles.customImageWrapper}>
                  <img
                    src={`/api/images/artists/${artistId}/custom/${image.id}`}
                    alt={`Custom ${image.imageType}`}
                    className={styles.customImage}
                    onError={(e) => {
                      e.currentTarget.src = '/images/avatar-default.svg';
                    }}
                  />
                </div>

                <div className={styles.customImageInfo}>
                  <p className={styles.customImageName}>{image.fileName}</p>
                  <p className={styles.customImageSize}>{formatFileSize(Number(image.fileSize))}</p>
                </div>

                <div className={styles.customImageActions}>
                  {!image.isActive && (
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleApplyCustomImage(image)}
                      disabled={isApplying}
                      loading={isApplying && selectedCustomImage?.id === image.id}
                    >
                      Aplicar
                    </Button>
                  )}
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => handleDeleteCustomImage(image, e)}
                    disabled={isDeleting}
                    title="Eliminar imagen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoadingCustomImages && (
        <div className={styles.loadingState}>
          <p>Cargando imágenes personalizadas...</p>
        </div>
      )}
    </div>
  );
}
