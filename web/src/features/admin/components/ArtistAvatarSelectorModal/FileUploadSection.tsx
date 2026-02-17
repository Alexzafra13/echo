import { Upload, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { formatFileSize } from '@shared/utils/format';
import { AvatarImageType, CustomImage } from '../../api/artist-avatars.api';
import { useCustomImageUpload } from './useCustomImageUpload';
import styles from './FileUploadSection.module.css';

interface FileUploadSectionProps {
  artistId: string;
  imageType: AvatarImageType;
  onSuccess?: () => void;
}

export function FileUploadSection({ artistId, imageType, onSuccess }: FileUploadSectionProps) {
  const {
    selectedFile,
    previewUrl,
    fileInputRef,
    handleFileSelect,
    customImages,
    selectedCustomImage,
    setSelectedCustomImage,
    isLoadingCustomImages,
    isUploading,
    isApplying,
    isDeleting,
    displayError,
    handleUpload,
    handleCancel,
    handleApplyCustomImage,
    handleDeleteCustomImage,
  } = useCustomImageUpload({ artistId, imageType, onSuccess });

  return (
    <div className={styles.container}>
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
              <p className={styles.uploadText}>Haz clic para seleccionar una imagen</p>
              <span className={styles.uploadHint}>JPEG, PNG o WebP (máx. 10MB)</span>
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
              <img src={previewUrl || ''} alt="Preview" className={styles.previewImage} />
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

      {customImages.length > 0 && (
        <div className={styles.customImagesSection}>
          <h3 className={styles.sectionTitle}>Imágenes subidas ({customImages.length})</h3>

          <div className={styles.customImagesGrid}>
            {customImages.map((image) => (
              <CustomImageCard
                key={image.id}
                image={image}
                artistId={artistId}
                isSelected={selectedCustomImage?.id === image.id}
                isApplying={isApplying}
                isDeleting={isDeleting}
                onSelect={() => setSelectedCustomImage(image)}
                onApply={() => handleApplyCustomImage(image)}
                onDelete={(e) => handleDeleteCustomImage(image, e)}
              />
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

interface CustomImageCardProps {
  image: CustomImage;
  artistId: string;
  isSelected: boolean;
  isApplying: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onApply: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function CustomImageCard({
  image,
  artistId,
  isSelected,
  isApplying,
  isDeleting,
  onSelect,
  onApply,
  onDelete,
}: CustomImageCardProps) {
  const cardClassName = [
    styles.customImageCard,
    isSelected ? styles.customImageCardSelected : '',
    image.isActive ? styles.customImageCardActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClassName} onClick={onSelect}>
      {isSelected && (
        <div className={styles.selectedBadge}>
          <Check size={20} />
        </div>
      )}

      {image.isActive && <div className={styles.activeBadge}>Activa</div>}

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
            onClick={onApply}
            disabled={isApplying}
            loading={isApplying && isSelected}
          >
            Aplicar
          </Button>
        )}
        <button
          className={styles.deleteButton}
          onClick={onDelete}
          disabled={isDeleting}
          title="Eliminar imagen"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
