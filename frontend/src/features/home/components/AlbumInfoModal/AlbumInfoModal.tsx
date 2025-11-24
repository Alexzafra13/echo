import { X } from 'lucide-react';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import styles from './AlbumInfoModal.module.css';

interface AlbumInfoModalProps {
  album: any; // Album type
  tracks?: any[]; // Tracks for additional info
  onClose: () => void;
}

/**
 * AlbumInfoModal Component
 * Displays detailed information about an album
 */
export function AlbumInfoModal({ album, tracks = [], onClose }: AlbumInfoModalProps) {
  const coverUrl = getCoverUrl(album.coverImage);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0 || !isFinite(bytes)) return 'Desconocido';

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

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate total size and duration from tracks
  const totalSize = tracks.reduce((acc, track) => {
    const size = track.size || 0;

    // Safety check for NaN or Infinity
    if (!isFinite(size)) {
      console.warn('Invalid track size:', size, 'for track:', track.title);
      return acc;
    }

    return acc + size;
  }, 0);
  const totalDuration = tracks.reduce((acc, track) => acc + (track.duration || 0), 0);

  // Get unique formats from tracks
  const formats = [...new Set(tracks.map(t => t.suffix?.toUpperCase()).filter(Boolean))];

  return (
    <div className={styles.albumInfoModal} onClick={onClose}>
      <div className={styles.albumInfoModal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.albumInfoModal__header}>
          <h2 className={styles.albumInfoModal__title}>Información del álbum</h2>
          <button
            className={styles.albumInfoModal__closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cover and basic info */}
        <div className={styles.albumInfoModal__hero}>
          <div className={styles.albumInfoModal__cover}>
            <img
              src={coverUrl}
              alt={album.title}
              className={styles.albumInfoModal__coverImage}
            />
          </div>
          <div className={styles.albumInfoModal__heroInfo}>
            <h3 className={styles.albumInfoModal__albumTitle}>{album.title}</h3>
            {album.artist && (
              <p className={styles.albumInfoModal__artist}>{album.artist}</p>
            )}
            {album.year && (
              <p className={styles.albumInfoModal__year}>{album.year}</p>
            )}
          </div>
        </div>

        {/* Info sections */}
        <div className={styles.albumInfoModal__sections}>
          {/* Basic info */}
          <div className={styles.albumInfoModal__section}>
            <h4 className={styles.albumInfoModal__sectionTitle}>Información general</h4>
            <div className={styles.albumInfoModal__infoGrid}>
              <div className={styles.albumInfoModal__infoRow}>
                <span className={styles.albumInfoModal__infoLabel}>Título:</span>
                <span className={styles.albumInfoModal__infoValue}>{album.title}</span>
              </div>
              {album.artist && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Artista:</span>
                  <span className={styles.albumInfoModal__infoValue}>{album.artist}</span>
                </div>
              )}
              {album.year && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Año:</span>
                  <span className={styles.albumInfoModal__infoValue}>{album.year}</span>
                </div>
              )}
              <div className={styles.albumInfoModal__infoRow}>
                <span className={styles.albumInfoModal__infoLabel}>Canciones:</span>
                <span className={styles.albumInfoModal__infoValue}>
                  {album.totalTracks || tracks.length}
                </span>
              </div>
              {totalDuration > 0 && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Duración:</span>
                  <span className={styles.albumInfoModal__infoValue}>
                    {formatDuration(totalDuration)}
                  </span>
                </div>
              )}
              {album.genre && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Género:</span>
                  <span className={styles.albumInfoModal__infoValue}>{album.genre}</span>
                </div>
              )}
            </div>
          </div>

          {/* Technical info */}
          <div className={styles.albumInfoModal__section}>
            <h4 className={styles.albumInfoModal__sectionTitle}>Información técnica</h4>
            <div className={styles.albumInfoModal__infoGrid}>
              {formats.length > 0 && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Formato:</span>
                  <span className={styles.albumInfoModal__infoValue}>
                    {formats.join(', ')}
                  </span>
                </div>
              )}
              {totalSize > 0 && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Tamaño:</span>
                  <span className={styles.albumInfoModal__infoValue}>
                    {formatFileSize(totalSize)}
                  </span>
                </div>
              )}
              {album.createdAt && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Agregado:</span>
                  <span className={styles.albumInfoModal__infoValue}>
                    {formatDate(album.createdAt)}
                  </span>
                </div>
              )}
              {album.path && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Ubicación:</span>
                  <span className={styles.albumInfoModal__infoValue} title={album.path}>
                    {album.path}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
