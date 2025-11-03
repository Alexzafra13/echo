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
    <section className={styles.heroSection}>
      {/* Background Image with blur effect */}
      <div
        className={styles.heroSection__background}
        style={{
          backgroundImage: `url(${backgroundUrl})`,
        }}
      />

      <div className={styles.heroSection__content}>
        {/* Album Cover */}
        <img
          src={coverUrl}
          alt={album.title}
          className={styles.heroSection__albumCover}
          onError={handleImageError}
        />

        {/* Album Info */}
        <div className={styles.heroSection__info}>
          <h1 className={styles.heroSection__artistName}>{album.artist}</h1>
          <h2 className={styles.heroSection__albumTitle}>{album.title}</h2>
          <p className={styles.heroSection__meta}>
            {album.artist} • {album.title} - {album.year}
            {album.totalTracks && ` • ${album.totalTracks} Songs`}
          </p>

          <Button
            variant="primary"
            size="lg"
            onClick={handlePlay}
            leftIcon={<Play size={24} fill="currentColor" />}
            className={styles.heroSection__playButton}
          >
            Play
          </Button>
        </div>

        {/* Optional: Album Art (side image) */}
        {album.albumArt && (
          <img
            src={album.albumArt}
            alt={`${album.title} artwork`}
            className={styles.heroSection__albumArt}
          />
        )}
      </div>
    </section>
  );
}
