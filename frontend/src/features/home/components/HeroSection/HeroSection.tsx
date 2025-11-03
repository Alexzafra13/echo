import { Play } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import type { HeroSectionProps } from '../../types';
import styles from './HeroSection.module.css';

/**
 * HeroSection Component
 * Displays the featured album with large cover, background, and play button
 *
 * @example
 * <HeroSection
 *   album={featuredAlbum}
 *   onPlay={() => playAlbum(album.id)}
 * />
 */
export function HeroSection({ album, onPlay }: HeroSectionProps) {
  const handlePlay = () => {
    onPlay?.();
    // TODO: Implement play functionality
    console.log('Playing album:', album.id);
  };

  const coverUrl = getCoverUrl(album.coverImage);
  const backgroundUrl = album.backgroundImage || coverUrl;

  return (
    <section className={styles.hero}>
      {/* Background Image with blur effect */}
      <div
        className={styles.heroBackground}
        style={{
          backgroundImage: `url(${backgroundUrl})`,
        }}
      />

      <div className={styles.heroContent}>
        {/* Album Cover */}
        <img
          src={coverUrl}
          alt={album.title}
          className={styles.albumCover}
          onError={handleImageError}
        />

        {/* Album Info */}
        <div className={styles.albumInfo}>
          <h1 className={styles.artistName}>{album.artist}</h1>
          <h2 className={styles.albumTitle}>{album.title}</h2>
          <p className={styles.albumMeta}>
            {album.artist} • {album.title} - {album.year}
            {album.totalTracks && ` • ${album.totalTracks} Songs`}
          </p>

          <Button
            variant="primary"
            size="lg"
            onClick={handlePlay}
            leftIcon={<Play size={24} fill="currentColor" />}
            className={styles.playButton}
          >
            Play
          </Button>
        </div>

        {/* Optional: Album Art (side image) */}
        {album.albumArt && (
          <img
            src={album.albumArt}
            alt={`${album.title} artwork`}
            className={styles.albumArt}
          />
        )}
      </div>
    </section>
  );
}
