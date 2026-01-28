import { useState, useCallback } from 'react';
import { useFileUpload } from '@shared/hooks/useFileUpload';
import {
  useUploadCustomImage,
  useListCustomImages,
  useApplyCustomImage,
  useDeleteCustomImage,
} from '../../hooks/useArtistAvatars';
import { CustomImage, AvatarImageType } from '../../api/artist-avatars.api';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';

interface UseCustomImageUploadOptions {
  artistId: string;
  imageType: AvatarImageType;
  onSuccess?: () => void;
}

export function useCustomImageUpload({ artistId, imageType, onSuccess }: UseCustomImageUploadOptions) {
  const [selectedCustomImage, setSelectedCustomImage] = useState<CustomImage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const customImages = (customImagesData?.customImages || []).filter(
    (img) => img.imageType === imageType
  );

  const displayError = uploadError || fileError;

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;

    setUploadError(null);
    uploadImage(
      { artistId, imageType, file: selectedFile },
      {
        onSuccess: (data) => {
          applyImage(
            { artistId, customImageId: data.customImageId },
            {
              onSuccess: () => {
                resetInput();
                onSuccess?.();
              },
              onError: (err) => {
                if (import.meta.env.DEV) {
                  logger.error('[FileUpload] ❌ Apply error:', err);
                }
                setUploadError(getApiErrorMessage(err, 'Error al aplicar la imagen'));
                resetInput();
              },
            }
          );
        },
        onError: (err) => {
          if (import.meta.env.DEV) {
            logger.error('[FileUpload] ❌ Upload error:', err);
          }
          setUploadError(getApiErrorMessage(err, 'Error al subir la imagen'));
        },
      }
    );
  }, [selectedFile, artistId, imageType, uploadImage, applyImage, resetInput, onSuccess]);

  const handleCancel = useCallback(() => {
    resetInput();
    setUploadError(null);
  }, [resetInput]);

  const handleApplyCustomImage = useCallback(
    (image: CustomImage) => {
      applyImage(
        { artistId, customImageId: image.id },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => {
            if (import.meta.env.DEV) {
              logger.error('[FileUpload] ❌ Apply error:', err);
            }
            setUploadError(getApiErrorMessage(err, 'Error al aplicar la imagen'));
          },
        }
      );
    },
    [artistId, applyImage, onSuccess]
  );

  const handleDeleteCustomImage = useCallback(
    (image: CustomImage, e: React.MouseEvent) => {
      e.stopPropagation();

      if (!confirm('¿Estás seguro de eliminar esta imagen personalizada?')) {
        return;
      }

      deleteImage(
        { artistId, customImageId: image.id },
        {
          onSuccess: () => {
            if (selectedCustomImage?.id === image.id) {
              setSelectedCustomImage(null);
            }
          },
          onError: (err) => {
            if (import.meta.env.DEV) {
              logger.error('[FileUpload] ❌ Delete error:', err);
            }
            setUploadError(getApiErrorMessage(err, 'Error al eliminar la imagen'));
          },
        }
      );
    },
    [artistId, deleteImage, selectedCustomImage]
  );

  return {
    // File upload state
    selectedFile,
    previewUrl,
    fileInputRef,
    handleFileSelect,

    // Custom images state
    customImages,
    selectedCustomImage,
    setSelectedCustomImage,
    isLoadingCustomImages,

    // Loading states
    isUploading,
    isApplying,
    isDeleting,

    // Error state
    displayError,

    // Actions
    handleUpload,
    handleCancel,
    handleApplyCustomImage,
    handleDeleteCustomImage,
  };
}
