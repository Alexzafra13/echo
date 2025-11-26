import { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Loader, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui';
import {
  useUploadCustomCover,
  useListCustomCovers,
  useApplyCustomCover,
  useDeleteCustomCover,
} from '../../hooks/useAlbumCoversCustom';
import styles from './AlbumCoverUploadTab.module.css';

interface AlbumCoverUploadTabProps {
  albumId: string;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AlbumCoverUploadTab({ albumId, onSuccess }: AlbumCoverUploadTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: uploadCover, isPending: isUploading } = useUploadCustomCover();
  const { mutate: applyCover, isPending: isApplying } = useApplyCustomCover();
  const { mutate: deleteCover, isPending: isDeleting } = useDeleteCustomCover();
  const { data: customCoversData, isLoading: isLoadingCovers } = useListCustomCovers(albumId);

  const customCovers = (customCoversData?.customCovers || []).filter(
    (cover) => cover.albumId === albumId
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Formato no válido. Solo se permiten JPG, PNG y WebP');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('El archivo excede el tamaño máximo de 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
                setSelectedFile(null);
                setPreviewUrl(null);
                onSuccess?.();
              },
              onError: (error: any) => {
                if (import.meta.env.DEV) {
                  console.error('[AlbumCoverUpload] ❌ Error applying cover:', error);
                }
                setUploadError(error?.response?.data?.message || 'Error al aplicar la portada');
              },
            }
          );
        },
        onError: (error: any) => {
          if (import.meta.env.DEV) {
            console.error('[AlbumCoverUpload] ❌ Error uploading cover:', error);
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
            console.error('[AlbumCoverUpload] ❌ Error applying cover:', error);
          }
          setUploadError(error?.response?.data?.message || 'Error al aplicar la portada');
        },
      }
    );
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isProcessing = isUploading || isApplying;

  return (
    <div className={styles.container}>
      {/* File Selection */}
      <div className={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
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
      {uploadError && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          <span>{uploadError}</span>
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
