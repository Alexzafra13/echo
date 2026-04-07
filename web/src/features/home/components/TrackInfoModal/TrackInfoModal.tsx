import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Music2 } from 'lucide-react';
import type { Track } from '../../types';
import { formatDuration, formatFileSize, formatBitrate, formatDate } from '@shared/utils/format';
import { getCoverUrl } from '@shared/utils/cover.utils';
import {
  useTrackDjAnalysis,
  useDominantColor,
  useSheetDragToClose,
  useIsMobile,
} from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './TrackInfoModal.module.css';

interface TrackInfoModalProps {
  track: Track;
  onClose: () => void;
}

/**
 * Modal de info de pista. En desktop, diálogo centrado; en móvil, bottom sheet con color del álbum.
 */
export function TrackInfoModal({ track, onClose }: TrackInfoModalProps) {
  const { t } = useTranslation();
  // Use coverImage (federated tracks) or local album cover endpoint
  const coverUrl =
    track.coverImage ||
    (track.albumId ? getCoverUrl(`/api/albums/${track.albumId}/cover`) : undefined);
  const { djAnalysis: fetchedDjAnalysis, isLoading: djLoading } = useTrackDjAnalysis(track.id);
  // Use fetched DJ analysis, or fall back to embedded data (for federated tracks)
  const djAnalysis = fetchedDjAnalysis || track.djAnalysis || null;
  const dominantColor = useDominantColor(coverUrl);
  const isMobile = useIsMobile();
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Lock body scroll
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

  // Drag-down-to-close for mobile bottom sheet
  const { sheetRef, scrollRef, overlayRef } = useSheetDragToClose({
    onClose,
    enabled: isMobile,
  });

  const colorStyle = {
    '--dominant-color': dominantColor,
  } as React.CSSProperties;

  // Shared info sections content
  const renderSections = () => (
    <div className={styles.trackInfoModal__sections}>
      {/* Basic info */}
      <div className={styles.trackInfoModal__section}>
        <h4 className={styles.trackInfoModal__sectionTitle}>{t('trackInfo.generalInfo')}</h4>
        <div className={styles.trackInfoModal__infoGrid}>
          <div className={styles.trackInfoModal__infoRow}>
            <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.titleLabel')}</span>
            <span className={styles.trackInfoModal__infoValue}>{track.title}</span>
          </div>
          {track.artistName && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.artist')}</span>
              <span className={styles.trackInfoModal__infoValue}>{track.artistName}</span>
            </div>
          )}
          {track.albumName && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.album')}</span>
              <span className={styles.trackInfoModal__infoValue}>{track.albumName}</span>
            </div>
          )}
          {track.year && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.year')}</span>
              <span className={styles.trackInfoModal__infoValue}>{track.year}</span>
            </div>
          )}
          {track.duration && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>
                {t('trackInfo.durationLabel')}
              </span>
              <span className={styles.trackInfoModal__infoValue}>
                {formatDuration(track.duration)}
              </span>
            </div>
          )}
          <div className={styles.trackInfoModal__infoRow}>
            <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.disc')}</span>
            <span className={styles.trackInfoModal__infoValue}>
              {track.discNumber || 1}
              {track.trackNumber && ` - ${t('trackInfo.track')} ${track.trackNumber}`}
            </span>
          </div>
        </div>
      </div>

      {/* Technical info */}
      <div className={styles.trackInfoModal__section}>
        <h4 className={styles.trackInfoModal__sectionTitle}>{t('trackInfo.technicalInfo')}</h4>
        <div className={styles.trackInfoModal__infoGrid}>
          {track.suffix && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.formatLabel')}</span>
              <span className={styles.trackInfoModal__infoValue}>{track.suffix.toUpperCase()}</span>
            </div>
          )}
          {track.bitRate && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.bitrate')}</span>
              <span className={styles.trackInfoModal__infoValue}>
                {formatBitrate(track.bitRate)}
              </span>
            </div>
          )}
          {track.size && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.size')}</span>
              <span className={styles.trackInfoModal__infoValue}>{formatFileSize(track.size)}</span>
            </div>
          )}
          {track.path && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.location')}</span>
              <span className={styles.trackInfoModal__infoValue} title={track.path}>
                {track.path}
              </span>
            </div>
          )}
          {track.createdAt && (
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.addedDate')}</span>
              <span className={styles.trackInfoModal__infoValue}>
                {formatDate(track.createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Audio normalization info */}
      <div className={styles.trackInfoModal__section}>
        <h4 className={styles.trackInfoModal__sectionTitle}>{t('trackInfo.audioNormalization')}</h4>
        <div className={styles.trackInfoModal__infoGrid}>
          <div className={styles.trackInfoModal__infoRow}>
            <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.status')}</span>
            <span className={styles.trackInfoModal__infoValue}>
              {track.rgTrackGain !== undefined && track.rgTrackGain !== null ? (
                <span className={styles.trackInfoModal__normalized}>{t('trackInfo.analyzed')}</span>
              ) : (
                <span className={styles.trackInfoModal__pending}>
                  {t('trackInfo.pendingStatus')}
                </span>
              )}
            </span>
          </div>
          {track.rgTrackGain !== undefined && track.rgTrackGain !== null && (
            <>
              <div className={styles.trackInfoModal__infoRow}>
                <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.gain')}</span>
                <span className={styles.trackInfoModal__infoValue}>
                  {track.rgTrackGain > 0 ? '+' : ''}
                  {track.rgTrackGain.toFixed(2)} dB
                </span>
              </div>
              {track.rgTrackPeak !== undefined && track.rgTrackPeak !== null && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>True Peak:</span>
                  <span className={styles.trackInfoModal__infoValue}>
                    {(20 * Math.log10(track.rgTrackPeak)).toFixed(1)} dBTP
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* DJ Analysis */}
      <div className={styles.trackInfoModal__section}>
        <h4 className={styles.trackInfoModal__sectionTitle}>
          <Music2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {t('trackInfo.djAnalysis')}
        </h4>
        {djLoading && !djAnalysis ? (
          <div className={styles.trackInfoModal__djNotAvailable}>{t('common.loading')}</div>
        ) : !djAnalysis && track.bpm ? (
          // Fallback: show BPM from track data
          <div className={styles.trackInfoModal__djGrid}>
            <div className={styles.trackInfoModal__djItem}>
              <span className={styles.trackInfoModal__djLabel}>BPM</span>
              <span className={styles.trackInfoModal__djValue}>{Math.round(track.bpm)}</span>
            </div>
          </div>
        ) : !djAnalysis ? (
          <div className={styles.trackInfoModal__djNotAvailable}>{t('trackInfo.notAvailable')}</div>
        ) : djAnalysis.status === 'pending' ? (
          <div className={styles.trackInfoModal__infoRow}>
            <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.status')}</span>
            <span className={styles.trackInfoModal__infoValue}>
              <span className={styles.trackInfoModal__pending}>{t('trackInfo.pendingStatus')}</span>
            </span>
          </div>
        ) : djAnalysis.status === 'analyzing' ? (
          <div className={styles.trackInfoModal__infoRow}>
            <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.status')}</span>
            <span className={styles.trackInfoModal__infoValue}>
              <span className={styles.trackInfoModal__djAnalyzing}>{t('trackInfo.analyzing')}</span>
            </span>
          </div>
        ) : djAnalysis.status === 'failed' ? (
          <div className={styles.trackInfoModal__infoGrid}>
            <div className={styles.trackInfoModal__infoRow}>
              <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.status')}</span>
              <span className={styles.trackInfoModal__infoValue}>
                <span className={styles.trackInfoModal__djFailed}>{t('trackInfo.error')}</span>
              </span>
            </div>
            {djAnalysis.analysisError && (
              <div className={styles.trackInfoModal__infoRow}>
                <span className={styles.trackInfoModal__infoLabel}>{t('trackInfo.detail')}</span>
                <span className={styles.trackInfoModal__infoValue}>{djAnalysis.analysisError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.trackInfoModal__djGrid}>
            {/* BPM */}
            <div className={styles.trackInfoModal__djItem}>
              <span className={styles.trackInfoModal__djLabel}>BPM</span>
              <span className={styles.trackInfoModal__djValue}>
                {djAnalysis.bpm && djAnalysis.bpm > 0 ? Math.round(djAnalysis.bpm) : '—'}
              </span>
            </div>

            {/* Key / Camelot */}
            <div className={styles.trackInfoModal__djItem}>
              <span className={styles.trackInfoModal__djLabel}>{t('trackInfo.key')}</span>
              <div className={styles.trackInfoModal__camelotBadge}>
                {djAnalysis.camelotKey && djAnalysis.camelotColor ? (
                  <span
                    className={styles.trackInfoModal__camelotKey}
                    style={{
                      backgroundColor: djAnalysis.camelotColor.bg,
                      color: djAnalysis.camelotColor.text,
                    }}
                  >
                    {djAnalysis.camelotKey}
                  </span>
                ) : null}
                <span className={styles.trackInfoModal__musicalKey}>
                  {djAnalysis.key && djAnalysis.key !== 'Unknown' ? djAnalysis.key : '—'}
                </span>
              </div>
            </div>

            {/* Energy */}
            <div className={styles.trackInfoModal__djItem}>
              <span className={styles.trackInfoModal__djLabel}>{t('trackInfo.energy')}</span>
              {djAnalysis.energy !== undefined ? (
                <>
                  <div className={styles.trackInfoModal__progressBar}>
                    <div
                      className={`${styles.trackInfoModal__progressFill} ${styles['trackInfoModal__progressFill--energy']}`}
                      style={{ width: `${djAnalysis.energy * 100}%` }}
                    />
                  </div>
                  <span className={styles.trackInfoModal__progressValue}>
                    {Math.round(djAnalysis.energy * 100)}%
                  </span>
                </>
              ) : (
                <span className={styles.trackInfoModal__djValue}>—</span>
              )}
            </div>

            {/* Danceability */}
            <div className={styles.trackInfoModal__djItem}>
              <span className={styles.trackInfoModal__djLabel}>{t('trackInfo.danceability')}</span>
              {djAnalysis.danceability !== undefined ? (
                <>
                  <div className={styles.trackInfoModal__progressBar}>
                    <div
                      className={`${styles.trackInfoModal__progressFill} ${styles['trackInfoModal__progressFill--danceability']}`}
                      style={{ width: `${djAnalysis.danceability * 100}%` }}
                    />
                  </div>
                  <span className={styles.trackInfoModal__progressValue}>
                    {Math.round(djAnalysis.danceability * 100)}%
                  </span>
                </>
              ) : (
                <span className={styles.trackInfoModal__djValue}>—</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lyrics if available */}
      {track.lyrics && (
        <div className={styles.trackInfoModal__section}>
          <h4 className={styles.trackInfoModal__sectionTitle}>{t('trackInfo.lyrics')}</h4>
          <div className={styles.trackInfoModal__lyrics}>{track.lyrics}</div>
        </div>
      )}

      {/* Comment if available */}
      {track.comment && (
        <div className={styles.trackInfoModal__section}>
          <h4 className={styles.trackInfoModal__sectionTitle}>{t('trackInfo.comment')}</h4>
          <div className={styles.trackInfoModal__comment}>{track.comment}</div>
        </div>
      )}
    </div>
  );

  // Mobile: bottom sheet via Portal
  if (isMobile) {
    return (
      <Portal>
        {/* Overlay */}
        <div
          ref={overlayRef}
          className={`${styles.trackInfoModal__overlay} ${closing ? styles['trackInfoModal__overlay--closing'] : ''}`}
          onClick={handleClose}
        />

        {/* Bottom sheet */}
        <div
          ref={sheetRef}
          className={`${styles.trackInfoModal__sheet} ${closing ? styles['trackInfoModal__sheet--closing'] : ''}`}
          style={colorStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className={styles.trackInfoModal__sheetHandle} />

          {/* Track header */}
          <div className={styles.trackInfoModal__sheetHeader}>
            {coverUrl && (
              <img
                src={coverUrl}
                alt={track.title}
                className={styles.trackInfoModal__sheetCover}
                loading="lazy"
              />
            )}
            <div className={styles.trackInfoModal__sheetInfo}>
              <span className={styles.trackInfoModal__sheetTitle}>{track.title}</span>
              {track.artistName && (
                <span className={styles.trackInfoModal__sheetArtist}>
                  {track.artistName}
                  {track.albumName ? ` · ${track.albumName}` : ''}
                </span>
              )}
            </div>
            <button
              className={styles.trackInfoModal__sheetClose}
              onClick={handleClose}
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable content */}
          <div ref={scrollRef} className={styles.trackInfoModal__sheetContent}>
            {renderSections()}
          </div>
        </div>
      </Portal>
    );
  }

  // Desktop: centered modal
  return (
    <div className={styles.trackInfoModal} style={colorStyle} onClick={handleClose}>
      <div className={styles.trackInfoModal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.trackInfoModal__header}>
          <h2 className={styles.trackInfoModal__title}>{t('trackInfo.songInfo')}</h2>
          <button
            className={styles.trackInfoModal__closeButton}
            onClick={handleClose}
            aria-label={t('common.close')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Cover and basic info */}
        <div className={styles.trackInfoModal__hero}>
          <div className={styles.trackInfoModal__cover}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={track.title}
                className={styles.trackInfoModal__coverImage}
                loading="lazy"
              />
            ) : (
              <div className={styles.trackInfoModal__coverPlaceholder}>
                <span>?</span>
              </div>
            )}
          </div>
          <div className={styles.trackInfoModal__heroInfo}>
            <h3 className={styles.trackInfoModal__trackTitle}>{track.title}</h3>
            {track.artistName && (
              <p className={styles.trackInfoModal__artist}>{track.artistName}</p>
            )}
            {track.albumName && <p className={styles.trackInfoModal__album}>{track.albumName}</p>}
          </div>
        </div>

        {/* Info sections */}
        {renderSections()}
      </div>
    </div>
  );
}
