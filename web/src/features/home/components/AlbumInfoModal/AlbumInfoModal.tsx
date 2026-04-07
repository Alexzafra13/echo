import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { formatDuration, formatFileSize, formatDate } from '@shared/utils/format';
import { useDominantColor, useSheetDragToClose, useIsMobile } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import { logger } from '@shared/utils/logger';
import type { Album, Track } from '../../types';
import styles from './AlbumInfoModal.module.css';

interface AlbumInfoModalProps {
  album: Album;
  tracks?: Track[];
  onClose: () => void;
}

export function AlbumInfoModal({ album, tracks = [], onClose }: AlbumInfoModalProps) {
  const { t } = useTranslation();
  const coverUrl = getCoverUrl(album.coverImage);
  const dominantColor = useDominantColor(
    album.coverImage ? getCoverUrl(album.coverImage) : undefined
  );
  const isMobile = useIsMobile();
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = useCallback(() => {
    if (closing) return;
    if (isMobile) {
      setClosing(true);
      closeTimerRef.current = setTimeout(() => onClose(), 300);
    } else {
      onClose();
    }
  }, [closing, isMobile, onClose]);

  const { sheetRef, scrollRef, overlayRef } = useSheetDragToClose({
    onClose,
    enabled: isMobile,
  });

  const totalSize = tracks.reduce((acc, track) => {
    const rawSize = track.size;
    const size = typeof rawSize === 'string' ? parseInt(rawSize, 10) : rawSize || 0;
    if (!isFinite(size)) {
      if (import.meta.env.DEV) {
        logger.warn('Invalid track size:', size, 'for track:', track.title);
      }
      return acc;
    }
    return acc + size;
  }, 0);
  const totalDuration = tracks.reduce((acc, track) => acc + (track.duration || 0), 0);
  const formats = [...new Set(tracks.map((t) => t.suffix?.toUpperCase()).filter(Boolean))];
  const trackWithAlbumGain = tracks.find(
    (t) => t.rgAlbumGain !== undefined && t.rgAlbumGain !== null
  );
  const albumGain = trackWithAlbumGain?.rgAlbumGain;
  const albumPeak = trackWithAlbumGain?.rgAlbumPeak;
  const analyzedTracks = tracks.filter(
    (t) => t.rgTrackGain !== undefined && t.rgTrackGain !== null
  ).length;

  const colorStyle = {
    '--dominant-color': dominantColor,
  } as React.CSSProperties;

  const renderSections = () => (
    <div className={styles.albumInfoModal__sections}>
      <div className={styles.albumInfoModal__section}>
        <h4 className={styles.albumInfoModal__sectionTitle}>{t('trackInfo.generalInfo')}</h4>
        <div className={styles.albumInfoModal__infoGrid}>
          <div className={styles.albumInfoModal__infoRow}>
            <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.titleLabel')}</span>
            <span className={styles.albumInfoModal__infoValue}>{album.title}</span>
          </div>
          {album.artist && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.artist')}</span>
              <span className={styles.albumInfoModal__infoValue}>{album.artist}</span>
            </div>
          )}
          {album.year && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.year')}</span>
              <span className={styles.albumInfoModal__infoValue}>{album.year}</span>
            </div>
          )}
          <div className={styles.albumInfoModal__infoRow}>
            <span className={styles.albumInfoModal__infoLabel}>{t('albumInfo.songsLabel')}</span>
            <span className={styles.albumInfoModal__infoValue}>
              {album.totalTracks || tracks.length}
            </span>
          </div>
          {totalDuration > 0 && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>
                {t('trackInfo.durationLabel')}
              </span>
              <span className={styles.albumInfoModal__infoValue}>
                {formatDuration(totalDuration)}
              </span>
            </div>
          )}
          {album.genre && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('albumInfo.genreLabel')}</span>
              <span className={styles.albumInfoModal__infoValue}>{album.genre}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.albumInfoModal__section}>
        <h4 className={styles.albumInfoModal__sectionTitle}>{t('trackInfo.technicalInfo')}</h4>
        <div className={styles.albumInfoModal__infoGrid}>
          {formats.length > 0 && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.formatLabel')}</span>
              <span className={styles.albumInfoModal__infoValue}>{formats.join(', ')}</span>
            </div>
          )}
          {totalSize > 0 && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.size')}</span>
              <span className={styles.albumInfoModal__infoValue}>{formatFileSize(totalSize)}</span>
            </div>
          )}
          {album.createdAt && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.addedDate')}</span>
              <span className={styles.albumInfoModal__infoValue}>
                {formatDate(album.createdAt)}
              </span>
            </div>
          )}
          {album.path && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.location')}</span>
              <span className={styles.albumInfoModal__infoValue} title={album.path}>
                {album.path}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.albumInfoModal__section}>
        <h4 className={styles.albumInfoModal__sectionTitle}>{t('trackInfo.audioNormalization')}</h4>
        <div className={styles.albumInfoModal__infoGrid}>
          <div className={styles.albumInfoModal__infoRow}>
            <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.status')}</span>
            <span className={styles.albumInfoModal__infoValue}>
              {analyzedTracks === tracks.length ? (
                <span className={styles.albumInfoModal__normalized}>
                  {t('albumInfo.analyzed', { analyzed: analyzedTracks, total: tracks.length })}
                </span>
              ) : analyzedTracks > 0 ? (
                <span className={styles.albumInfoModal__partial}>
                  {t('albumInfo.partial', { analyzed: analyzedTracks, total: tracks.length })}
                </span>
              ) : (
                <span className={styles.albumInfoModal__pending}>
                  {t('trackInfo.pendingStatus')}
                </span>
              )}
            </span>
          </div>
          {albumGain !== undefined && albumGain !== null && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('trackInfo.gain')}</span>
              <span className={styles.albumInfoModal__infoValue}>
                {albumGain > 0 ? '+' : ''}
                {albumGain.toFixed(2)} dB
              </span>
            </div>
          )}
          {albumPeak !== undefined && albumPeak !== null && (
            <div className={styles.albumInfoModal__infoRow}>
              <span className={styles.albumInfoModal__infoLabel}>{t('albumInfo.truePeak')}</span>
              <span className={styles.albumInfoModal__infoValue}>
                {(20 * Math.log10(albumPeak)).toFixed(1)} dBTP
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile: bottom sheet via Portal
  if (isMobile) {
    return (
      <Portal>
        <div
          ref={overlayRef}
          className={`${styles.albumInfoModal__overlay} ${closing ? styles['albumInfoModal__overlay--closing'] : ''}`}
          onClick={handleClose}
        />
        <div
          ref={sheetRef}
          className={`${styles.albumInfoModal__sheet} ${closing ? styles['albumInfoModal__sheet--closing'] : ''}`}
          style={colorStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.albumInfoModal__sheetHandleArea}>
            <div className={styles.albumInfoModal__sheetHandle} />
          </div>

          <div className={styles.albumInfoModal__sheetHeader}>
            <img
              src={coverUrl}
              alt={album.title}
              className={styles.albumInfoModal__sheetCover}
              loading="lazy"
            />
            <div className={styles.albumInfoModal__sheetInfo}>
              <span className={styles.albumInfoModal__sheetTitle}>{album.title}</span>
              {album.artist && (
                <span className={styles.albumInfoModal__sheetArtist}>{album.artist}</span>
              )}
            </div>
            <button
              className={styles.albumInfoModal__sheetClose}
              onClick={handleClose}
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className={styles.albumInfoModal__sheetContent}>
            {renderSections()}
          </div>
        </div>
      </Portal>
    );
  }

  // Desktop: centered modal
  return (
    <div className={styles.albumInfoModal} style={colorStyle} onClick={handleClose}>
      <div className={styles.albumInfoModal__content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.albumInfoModal__header}>
          <h2 className={styles.albumInfoModal__title}>{t('albumInfo.title')}</h2>
          <button
            className={styles.albumInfoModal__closeButton}
            onClick={handleClose}
            aria-label={t('common.close')}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.albumInfoModal__hero}>
          <div className={styles.albumInfoModal__cover}>
            <img
              src={coverUrl}
              alt={album.title}
              className={styles.albumInfoModal__coverImage}
              loading="lazy"
            />
          </div>
          <div className={styles.albumInfoModal__heroInfo}>
            <h3 className={styles.albumInfoModal__albumTitle}>{album.title}</h3>
            {album.artist && <p className={styles.albumInfoModal__artist}>{album.artist}</p>}
            {album.year && <p className={styles.albumInfoModal__year}>{album.year}</p>}
          </div>
        </div>

        {renderSections()}
      </div>
    </div>
  );
}
