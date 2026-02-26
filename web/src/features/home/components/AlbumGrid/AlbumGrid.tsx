import { useLocation } from 'wouter';
import { AlbumCard } from '../AlbumCard';
import type { AlbumGridProps } from '../../types';
import { albumsService } from '../../services';
import { usePlayer } from '@features/player/context/PlayerContext';
import { logger } from '@shared/utils/logger';
import styles from './AlbumGrid.module.css';

interface ExtendedAlbumGridProps extends AlbumGridProps {
  showViewAll?: boolean;
  viewAllPath?: string;
  mobileLayout?: 'carousel' | 'grid';
}

export function AlbumGrid({
  title,
  albums,
  showViewAll = false,
  viewAllPath = '/albums',
  mobileLayout = 'carousel',
}: ExtendedAlbumGridProps) {
  const [, setLocation] = useLocation();
  const { playQueue } = usePlayer();

  const handleAlbumClick = (albumId: string) => {
    setLocation(`/album/${albumId}`);
  };

  const handlePlayClick = async (albumId: string) => {
    try {
      const album = albums.find((a) => a.id === albumId);
      const coverImage = album?.coverImage;

      const tracks = await albumsService.getAlbumTracks(albumId);
      if (tracks && tracks.length > 0) {
        const tracksWithCover = tracks.map((track) => ({
          id: track.id,
          title: track.title,
          artist: track.artistName || album?.artist || 'Unknown Artist',
          albumId: albumId,
          albumName: track.albumName || album?.title,
          duration: track.duration || 0,
          coverImage: coverImage,
          trackNumber: track.trackNumber,
          rgTrackGain: track.rgTrackGain,
          rgTrackPeak: track.rgTrackPeak,
        }));
        playQueue(tracksWithCover, 0, 'album');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Failed to load album tracks:', error);
      }
    }
  };

  const handleViewAllClick = () => {
    setLocation(viewAllPath);
  };

  if (!albums || albums.length === 0) {
    return null;
  }

  const gridClassName =
    mobileLayout === 'grid'
      ? `${styles.albumGrid__grid} ${styles['albumGrid__grid--mobileGrid']}`
      : styles.albumGrid__grid;

  return (
    <section className={styles.albumGrid}>
      <div className={styles.albumGrid__header}>
        <h2 className={styles.albumGrid__title}>{title}</h2>
        {showViewAll && (
          <button className={styles.albumGrid__viewAllButton} onClick={handleViewAllClick}>
            Ver todos →
          </button>
        )}
      </div>
      <div className={gridClassName}>
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            cover={album.coverImage}
            title={album.title}
            artist={album.artist}
            onClick={() => handleAlbumClick(album.id)}
            onPlayClick={() => handlePlayClick(album.id)}
          />
        ))}
      </div>
    </section>
  );
}
