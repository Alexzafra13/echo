import { X } from 'lucide-react';
import type { Track } from '../../types';
import { formatDuration } from '../../types/track.types';
import { getCoverUrl } from '@shared/utils/cover.utils';
import styles from './TrackInfoModal.module.css';

interface TrackInfoModalProps {
  track: Track;
  onClose: () => void;
}

/**
 * TrackInfoModal Component
 * Displays detailed information about a track
 */
export function TrackInfoModal({ track, onClose }: TrackInfoModalProps) {
  const coverUrl = track.albumId ? getCoverUrl(`/api/albums/${track.albumId}/cover`) : undefined;

  const formatFileSize = (bytes?: number | string): string => {
    if (!bytes) return 'Desconocido';

    // If already formatted as string, return it
    if (typeof bytes === 'string') return bytes;

    if (!isFinite(bytes)) return 'Desconocido';

    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;

    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    if (kb >= 1) {
      return `${kb.toFixed(2)} KB`;
    }
    return `${bytes} bytes`;
  };

  const formatBitrate = (bitrate?: number): string => {
    if (!bitrate) return 'Desconocido';
    return `${bitrate} kbps`;
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Desconocida';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.trackInfoModal} onClick={onClose}>
      <div className={styles.trackInfoModal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.trackInfoModal__header}>
          <h2 className={styles.trackInfoModal__title}>Información de la canción</h2>
          <button
            className={styles.trackInfoModal__closeButton}
            onClick={onClose}
            aria-label="Cerrar"
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
            {track.albumName && (
              <p className={styles.trackInfoModal__album}>{track.albumName}</p>
            )}
          </div>
        </div>

        {/* Info sections */}
        <div className={styles.trackInfoModal__sections}>
          {/* Basic info */}
          <div className={styles.trackInfoModal__section}>
            <h4 className={styles.trackInfoModal__sectionTitle}>Información general</h4>
            <div className={styles.trackInfoModal__infoGrid}>
              <div className={styles.trackInfoModal__infoRow}>
                <span className={styles.trackInfoModal__infoLabel}>Título:</span>
                <span className={styles.trackInfoModal__infoValue}>{track.title}</span>
              </div>
              {track.artistName && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>Artista:</span>
                  <span className={styles.trackInfoModal__infoValue}>{track.artistName}</span>
                </div>
              )}
              {track.albumName && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>Álbum:</span>
                  <span className={styles.trackInfoModal__infoValue}>{track.albumName}</span>
                </div>
              )}
              {track.year && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>Año:</span>
                  <span className={styles.trackInfoModal__infoValue}>{track.year}</span>
                </div>
              )}
              {track.duration && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>Duración:</span>
                  <span className={styles.trackInfoModal__infoValue}>{formatDuration(track.duration)}</span>
                </div>
              )}
              <div className={styles.trackInfoModal__infoRow}>
                <span className={styles.trackInfoModal__infoLabel}>Disco:</span>
                <span className={styles.trackInfoModal__infoValue}>
                  {track.discNumber || 1}
                  {track.trackNumber && ` - Track ${track.trackNumber}`}
                </span>
              </div>
            </div>
          </div>

          {/* Technical info */}
          <div className={styles.trackInfoModal__section}>
            <h4 className={styles.trackInfoModal__sectionTitle}>Información técnica</h4>
            <div className={styles.trackInfoModal__infoGrid}>
              {track.suffix && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>Formato:</span>
                  <span className={styles.trackInfoModal__infoValue}>
                    {track.suffix.toUpperCase()}
                  </span>
                </div>
              )}
              {track.bitRate && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>Bitrate:</span>
                  <span className={styles.trackInfoModal__infoValue}>
                    {formatBitrate(track.bitRate)}
                  </span>
                </div>
              )}
              {track.size && (
                <div className={styles.trackInfoModal__infoRow}>
                  <span className={styles.trackInfoModal__infoLabel}>Tamaño:</span>
                  <span className={styles.trackInfoModal__infoValue}>
                    {formatFileSize(track.size)}
                  </span>
                </div>
              )}
              <div className={styles.trackInfoModal__infoRow}>
                <span className={styles.trackInfoModal__infoLabel}>Ubicación:</span>
                <span className={styles.trackInfoModal__infoValue} title={track.path}>
                  {track.path}
                </span>
              </div>
              <div className={styles.trackInfoModal__infoRow}>
                <span className={styles.trackInfoModal__infoLabel}>Agregado:</span>
                <span className={styles.trackInfoModal__infoValue}>
                  {formatDate(track.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Lyrics if available */}
          {track.lyrics && (
            <div className={styles.trackInfoModal__section}>
              <h4 className={styles.trackInfoModal__sectionTitle}>Letra</h4>
              <div className={styles.trackInfoModal__lyrics}>
                {track.lyrics}
              </div>
            </div>
          )}

          {/* Comment if available */}
          {track.comment && (
            <div className={styles.trackInfoModal__section}>
              <h4 className={styles.trackInfoModal__sectionTitle}>Comentario</h4>
              <div className={styles.trackInfoModal__comment}>
                {track.comment}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
