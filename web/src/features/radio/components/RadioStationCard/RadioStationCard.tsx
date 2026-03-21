import { Heart, Music, ImagePlus, Trash2, Wand2 } from 'lucide-react';
import { memo, useRef, useEffect, useState, useCallback } from 'react';
import type { RadioBrowserStation } from '../../types';
import type { RadioStation } from '@features/player/types';
import type { RadioMetadata } from '../../hooks/useRadioMetadata';
import type { FaviconPreview } from '@features/admin/api/radio-favicons.api';
import { useAuthStore } from '@shared/store';
import {
  useUploadRadioFavicon,
  useDeleteRadioFavicon,
  useFetchFaviconPreviews,
  useSaveFaviconPreview,
} from '../../hooks/useRadioFavicon';
import { FaviconPreviewModal } from '../FaviconPreviewModal';
import styles from './RadioStationCard.module.css';

interface RadioStationCardProps {
  station: RadioBrowserStation | RadioStation;
  isFavorite?: boolean;
  isPlaying?: boolean;
  currentMetadata?: RadioMetadata | null;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
}

export const RadioStationCard = memo(function RadioStationCard({
  station,
  isFavorite = false,
  isPlaying = false,
  currentMetadata,
  onPlay,
  onToggleFavorite,
}: RadioStationCardProps) {
  const metadataTextRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin ?? false;

  const uploadMutation = useUploadRadioFavicon();
  const deleteMutation = useDeleteRadioFavicon();
  const previewsMutation = useFetchFaviconPreviews();
  const savePreviewMutation = useSaveFaviconPreview();

  const handleCardClick = useCallback(() => {
    onPlay?.();
  }, [onPlay]);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite?.();
    },
    [onToggleFavorite]
  );

  // Compatible con RadioBrowserStation y RadioStation
  const name = station.name;
  const favicon = 'favicon' in station ? station.favicon : null;
  const customFaviconUrl =
    'customFaviconUrl' in station ? (station as RadioStation).customFaviconUrl : null;
  const country = 'country' in station ? station.country : null;
  const tags = 'tags' in station ? station.tags : null;
  const codec = 'codec' in station ? station.codec : null;
  const bitrate = 'bitrate' in station ? station.bitrate : null;
  const homepage = 'homepage' in station ? station.homepage : null;

  // Get the station UUID (works for both types)
  const stationUuid =
    'stationuuid' in station
      ? (station as RadioBrowserStation).stationuuid
      : 'stationUuid' in station
        ? (station as RadioStation).stationUuid
        : null;

  // Priority: customFaviconUrl > favicon
  const displayFavicon = customFaviconUrl || favicon;

  const genreTags =
    tags && typeof tags === 'string' && tags.trim()
      ? tags.split(',').slice(0, 2).join(', ')
      : 'Radio';

  // Anima el texto de metadatos si desborda el contenedor
  useEffect(() => {
    if (metadataTextRef.current && currentMetadata?.title) {
      const element = metadataTextRef.current;
      const isOverflowing = element.scrollWidth > element.clientWidth;
      setShouldAnimate(isOverflowing);
    } else {
      setShouldAnimate(false);
    }
  }, [currentMetadata?.title]);

  const handleUploadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !stationUuid) return;

      uploadMutation.mutate({ stationUuid, file });

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [stationUuid, uploadMutation]
  );

  const handleDeleteFavicon = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!stationUuid) return;
      deleteMutation.mutate(stationUuid);
    },
    [stationUuid, deleteMutation]
  );

  const handleOpenPreviews = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!stationUuid) return;
      setIsPreviewModalOpen(true);
      previewsMutation.mutate({
        stationUuid,
        name,
        homepage: homepage || undefined,
      });
    },
    [stationUuid, name, homepage, previewsMutation]
  );

  const handleSelectPreview = useCallback(
    (preview: FaviconPreview) => {
      if (!stationUuid) return;
      savePreviewMutation.mutate(
        { stationUuid, dataUrl: preview.dataUrl, source: preview.source, stationName: name },
        {
          onSuccess: () => {
            setIsPreviewModalOpen(false);
          },
        }
      );
    },
    [stationUuid, savePreviewMutation]
  );

  const handleClosePreviewModal = useCallback(() => {
    setIsPreviewModalOpen(false);
  }, []);

  const isLoading = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <article
        className={`${styles.radioCard} ${isPlaying ? styles['radioCard--playing'] : ''}`}
        onClick={handleCardClick}
      >
        <div className={styles.radioCard__coverContainer}>
          <img src="/images/radio/echo_radio_dark.svg" alt="" className={`${styles.radioCard__fallback} ${styles['radioCard__fallback--dark']}`} />
          <img src="/images/radio/echo_radio_light.svg" alt="" className={`${styles.radioCard__fallback} ${styles['radioCard__fallback--light']}`} />
          {displayFavicon && (
            <img
              src={displayFavicon}
              alt={name}
              loading="lazy"
              className={styles.radioCard__cover}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className={styles.radioCard__overlay}>
            {onToggleFavorite && (
              <button
                className={`${styles.radioCard__favoriteButton} ${
                  isFavorite ? styles['radioCard__favoriteButton--active'] : ''
                }`}
                onClick={handleFavoriteClick}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            {isAdmin && stationUuid && (
              <div className={styles.radioCard__adminActions}>
                <button
                  className={styles.radioCard__adminButton}
                  onClick={handleUploadClick}
                  disabled={isLoading}
                  aria-label="Upload custom favicon"
                  title="Subir imagen personalizada"
                >
                  <ImagePlus size={14} />
                </button>
                <button
                  className={styles.radioCard__adminButton}
                  onClick={handleOpenPreviews}
                  disabled={isLoading}
                  aria-label="Buscar imagen en la web"
                  title="Buscar imagen en la web"
                >
                  <Wand2 size={14} />
                </button>
                {customFaviconUrl && (
                  <button
                    className={`${styles.radioCard__adminButton} ${styles['radioCard__adminButton--danger']}`}
                    onClick={handleDeleteFavicon}
                    disabled={isLoading}
                    aria-label="Remove custom favicon"
                    title="Eliminar imagen personalizada"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <div className={styles.radioCard__info}>
          <h3 className={styles.radioCard__title}>{name}</h3>
          <p className={styles.radioCard__meta}>
            {country && <span>{country}</span>}
            {country && genreTags && <span className={styles.radioCard__separator}>•</span>}
            {genreTags && <span>{genreTags}</span>}
          </p>
          {(codec || bitrate) && (
            <p className={styles.radioCard__quality}>
              {codec && <span>{codec.toUpperCase()}</span>}
              {codec && bitrate && <span className={styles.radioCard__separator}>•</span>}
              {bitrate && <span>{bitrate} kbps</span>}
            </p>
          )}
          {isPlaying && currentMetadata?.title && (
            <p className={styles.radioCard__nowPlaying}>
              <span
                ref={metadataTextRef}
                className={`${styles.radioCard__nowPlayingText} ${shouldAnimate ? styles['radioCard__nowPlayingText--animate'] : ''}`}
              >
                <Music size={12} />
                {currentMetadata.title}
              </span>
            </p>
          )}
        </div>
      </article>

      {isPreviewModalOpen && (
        <FaviconPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={handleClosePreviewModal}
          stationName={name}
          previews={previewsMutation.data?.previews ?? []}
          isLoading={previewsMutation.isPending}
          isSaving={savePreviewMutation.isPending}
          onSelect={handleSelectPreview}
        />
      )}
    </>
  );
});
