import { useState } from 'react';
import { Upload, X, Check, AlertCircle, Loader, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useFileUpload } from '@shared/hooks/useFileUpload';
import { formatFileSize } from '@shared/utils/format';
import {
  useUploadCustomCover,
  useListCustomCovers,
  useApplyCustomCover,
  useDeleteCustomCover,
} from '../../hooks/useAlbumCoversCustom';
import { logger } from '@shared/utils/logger';
import styles from './AlbumCoverUploadTab.module.css';

interface AlbumCoverUploadTabProps {
  albumId: string;
  onSuccess?: () => void;
}

export function AlbumCoverUploadTab({ albumId, onSuccess }: AlbumCoverUploadTabProps) {
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

  const { mutate: uploadCover, isPending: isUploading } = useUploadCustomCover();
  const { mutate: applyCover, isPending: isApplying } = useApplyCustomCover();
  const { mutate: deleteCover, isPending: isDeleting } = useDeleteCustomCover();
  const { data: customCoversData, isLoading: isLoadingCovers } = useListCustomCovers(albumId);

  const customCovers = (customCoversData?.customCovers || []).filter(
    (cover) => cover.albumId === albumId
  );

  // Combinar errores del hook y de upload
  const displayError = uploadError || fileError;

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploadError(null);

    uploadCover(
      { albumId, file: selectedFile },
      {
        onSuccess: (data) => {
          // Aplicar automáticamente la cover recién subida
          applyCover(
            {
              albumId,
              customCoverId: data.customCoverId,
            },
            {
              onSuccess: () => {
                resetInput();
                onSuccess?.();
              },
              onError: (error: any) => {
                if (import.meta.env.DEV) {
                  logger.error('[AlbumCoverUpload] ❌ Error applying cover:', error);
                }
                setUploadError(error?.response?.data?.message || 'Error al aplicar la portada');
              },
            }
          );
        },
        onError: (error: any) => {
          if (import.meta.env.DEV) {
            logger.error('[AlbumCoverUpload] ❌ Error uploading cover:', error);
          }
          setUploadError(error?.response?.data?.message || 'Error al subir la portada');
        },
      }
    );
  };

  const handleDelete = (coverId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta portada?')) return;

    deleteCover({ albumId, customCoverId: coverId });
  };

  const handleApply = (coverId: string) => {
    applyCover(
      { albumId, customCoverId: coverId },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (error: any) => {
          if (import.meta.env.DEV) {
            logger.error('[AlbumCoverUpload] ❌ Error applying cover:', error);
          }
          setUploadError(error?.response?.data?.message || 'Error al aplicar la portada');
        },
      }
    );
  };

  const handleCancelSelection = () => {
    resetInput();
    setUploadError(null);
  };

  const isProcessing = isUploading || isApplying;

  return (
    <div className={styles.container}>
      {/* File Selection */}
      <div className={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={isProcessing}
          style={{ display: 'none' }}
        />

        {!selectedFile ? (
          <button
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload size={48} />
            <p className={styles.uploadText}>Selecciona una portada</p>
            <span className={styles.uploadHint}>JPG, PNG o WebP (máx. 10MB)</span>
          </button>
        ) : (
          <div className={styles.previewContainer}>
            <button className={styles.removeButton} onClick={handleCancelSelection}>
              <X size={20} />
            </button>
            <img src={previewUrl!} alt="Preview" className={styles.previewImage} />
            <div className={styles.fileInfo}>
              <p className={styles.fileName}>{selectedFile.name}</p>
              <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={isProcessing}
              loading={isProcessing}
              fullWidth
            >
              {isUploading ? 'Subiendo...' : isApplying ? 'Aplicando...' : 'Subir y aplicar'}
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {displayError && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          <span>{displayError}</span>
        </div>
      )}

      {/* Uploaded Covers Gallery */}
      <div className={styles.gallerySection}>
        <h3 className={styles.galleryTitle}>Portadas subidas</h3>

        {isLoadingCovers ? (
          <div className={styles.loading}>
            <Loader className={styles.spinner} size={32} />
          </div>
        ) : customCovers.length === 0 ? (
          <div className={styles.emptyGallery}>
            <p>No hay portadas personalizadas</p>
            <span>Sube una portada desde tu PC para empezar</span>
          </div>
        ) : (
          <div className={styles.gallery}>
            {customCovers.map((cover) => (
              <div
                key={cover.id}
                className={`${styles.coverCard} ${cover.isActive ? styles.coverCardActive : ''}`}
              >
                {cover.isActive && (
                  <div className={styles.activeBadge}>
                    <Check size={14} />
                    Activa
                  </div>
                )}

                <div className={styles.coverImageWrapper}>
                  <img
                    src={`/api/images/albums/${albumId}/custom/${cover.id}`}
                    alt="Custom cover"
                    className={styles.coverImage}
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-album.png';
                    }}
                  />
                </div>

                <div className={styles.coverInfo}>
                  <p className={styles.coverName}>{cover.fileName}</p>
                  <p className={styles.coverSize}>{formatFileSize(Number(cover.fileSize))}</p>
                </div>

                <div className={styles.coverActions}>
                  {!cover.isActive && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleApply(cover.id)}
                      disabled={isApplying}
                    >
                      Aplicar
                    </Button>
                  )}
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(cover.id)}
                    disabled={isDeleting}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
