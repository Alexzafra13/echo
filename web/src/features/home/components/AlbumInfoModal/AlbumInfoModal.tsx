import { X } from 'lucide-react';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { formatDuration, formatFileSize, formatDate } from '@shared/utils/format';
import { logger } from '@shared/utils/logger';
import type { Album, Track } from '../../types';
import styles from './AlbumInfoModal.module.css';

interface AlbumInfoModalProps {
  album: Album;
  tracks?: Track[];
  onClose: () => void;
}

export function AlbumInfoModal({ album, tracks = [], onClose }: AlbumInfoModalProps) {
  const coverUrl = getCoverUrl(album.coverImage);

  const totalSize = tracks.reduce((acc, track) => {
    const rawSize = track.size;
    const size = typeof rawSize === 'string' ? parseInt(rawSize, 10) : (rawSize || 0);

    if (!isFinite(size)) {
      if (import.meta.env.DEV) {
        logger.warn('Invalid track size:', size, 'for track:', track.title);
      }
      return acc;
    }

    return acc + size;
  }, 0);
  const totalDuration = tracks.reduce((acc, track) => acc + (track.duration || 0), 0);

  const formats = [...new Set(tracks.map(t => t.suffix?.toUpperCase()).filter(Boolean))];

  const trackWithAlbumGain = tracks.find(t => t.rgAlbumGain !== undefined && t.rgAlbumGain !== null);
  const albumGain = trackWithAlbumGain?.rgAlbumGain;
  const albumPeak = trackWithAlbumGain?.rgAlbumPeak;

  const analyzedTracks = tracks.filter(t => t.rgTrackGain !== undefined && t.rgTrackGain !== null).length;

  return (
    <div className={styles.albumInfoModal} onClick={onClose}>
      <div className={styles.albumInfoModal__content} onClick={(e) => e.stopPropagation()}>

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


        <div className={styles.albumInfoModal__sections}>

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


          <div className={styles.albumInfoModal__section}>
            <h4 className={styles.albumInfoModal__sectionTitle}>Normalización de audio</h4>
            <div className={styles.albumInfoModal__infoGrid}>
              <div className={styles.albumInfoModal__infoRow}>
                <span className={styles.albumInfoModal__infoLabel}>Estado:</span>
                <span className={styles.albumInfoModal__infoValue}>
                  {analyzedTracks === tracks.length ? (
                    <span className={styles.albumInfoModal__normalized}>Analizado ({analyzedTracks}/{tracks.length})</span>
                  ) : analyzedTracks > 0 ? (
                    <span className={styles.albumInfoModal__partial}>Parcial ({analyzedTracks}/{tracks.length})</span>
                  ) : (
                    <span className={styles.albumInfoModal__pending}>Pendiente</span>
                  )}
                </span>
              </div>
              {albumGain !== undefined && albumGain !== null && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>Ganancia:</span>
                  <span className={styles.albumInfoModal__infoValue}>
                    {albumGain > 0 ? '+' : ''}{albumGain.toFixed(2)} dB
                  </span>
                </div>
              )}
              {albumPeak !== undefined && albumPeak !== null && (
                <div className={styles.albumInfoModal__infoRow}>
                  <span className={styles.albumInfoModal__infoLabel}>True Peak:</span>
                  <span className={styles.albumInfoModal__infoValue}>
                    {(20 * Math.log10(albumPeak)).toFixed(1)} dBTP
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
