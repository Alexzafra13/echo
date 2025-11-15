import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui';
import {
  useUploadCustomImage,
  useListCustomImages,
  useApplyCustomImage,
  useDeleteCustomImage,
} from '../../hooks/useArtistAvatars';
import { CustomImage } from '../../api/artist-avatars.api';
import styles from './FileUploadSection.module.css';

interface FileUploadSectionProps {
  artistId: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * FileUploadSection Component
 * Permite subir imágenes personalizadas desde el PC
 */
export function FileUploadSection({ artistId, imageType, onSuccess }: FileUploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedCustomImage, setSelectedCustomImage] = useState<CustomImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: uploadImage, isPending: isUploading } = useUploadCustomImage();
  const { data: customImagesData, isLoading: isLoadingCustomImages } = useListCustomImages(artistId);
  const { mutate: applyImage, isPending: isApplying } = useApplyCustomImage();
  const { mutate: deleteImage, isPending: isDeleting } = useDeleteCustomImage();

  // Filtrar imágenes por tipo
  const customImages = (customImagesData?.customImages || []).filter((img) => img.imageType === imageType);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Tipo de archivo no permitido. Use JPEG, PNG o WebP.');
      return;
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('El archivo excede el tamaño máximo de 10MB.');
      return;
    }

    setSelectedFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
          console.log('[FileUpload] ✅ Image uploaded successfully', data);

          // Aplicar automáticamente la imagen recién subida
          console.log('[FileUpload] Applying uploaded image automatically...');
          applyImage(
            {
              artistId,
              customImageId: data.customImageId,
            },
            {
              onSuccess: () => {
                console.log('[FileUpload] ✅ Image applied successfully');
                setSelectedFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                onSuccess?.();
              },
              onError: (error: any) => {
                console.error('[FileUpload] ❌ Apply error:', error);
                setUploadError(error?.response?.data?.message || 'Error al aplicar la imagen');
                // Limpiar el formulario aunque falle la aplicación
                setSelectedFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              },
            }
          );
        },
        onError: (error: any) => {
          console.error('[FileUpload] ❌ Upload error:', error);
          setUploadError(error?.response?.data?.message || 'Error al subir la imagen');
        },
      }
    );
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyCustomImage = (image: CustomImage) => {
    applyImage(
      {
        artistId,
        customImageId: image.id,
      },
      {
        onSuccess: () => {
          console.log('[FileUpload] ✅ Custom image applied successfully');
          onSuccess?.();
        },
        onError: (error: any) => {
          console.error('[FileUpload] ❌ Apply error:', error);
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
          console.log('[FileUpload] ✅ Custom image deleted successfully');
          if (selectedCustomImage?.id === image.id) {
            setSelectedCustomImage(null);
          }
        },
        onError: (error: any) => {
          console.error('[FileUpload] ❌ Delete error:', error);
          setUploadError(error?.response?.data?.message || 'Error al eliminar la imagen');
        },
      }
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      profile: 'Perfil',
      background: 'Fondo',
      banner: 'Banner',
      logo: 'Logo',
    };
    return labels[type] || type;
  };

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

        {uploadError && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{uploadError}</span>
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
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/artists/${artistId}/images/custom/${image.id}`}
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
