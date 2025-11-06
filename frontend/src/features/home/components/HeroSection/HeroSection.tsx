import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { useArtistImages, getArtistImageUrl, useAutoEnrichArtist } from '../../hooks';
import type { HeroSectionProps } from '../../types';
import styles from './HeroSection.module.css';

/**
 * HeroSection Component
 * Displays the featured album with large cover, background, play button, and navigation
 * Uses Fanart.tv images when available (background and logo) with fallback to album cover
 * Automatically enriches artist metadata if not already available
 *
 * @example
 * <HeroSection
 *   album={featuredAlbum}
 *   onPlay={() => playAlbum(album.id)}
 *   onNext={() => nextFeatured()}
 *   onPrevious={() => previousFeatured()}
 * />
 */
export function HeroSection({ album, onPlay, onNext, onPrevious }: HeroSectionProps) {
  // Fetch artist images from Fanart.tv
  const { data: artistImages } = useArtistImages(album.artistId);

  // Check if artist has any hero images (background or logo)
  const hasHeroImages = artistImages?.images.background?.exists || artistImages?.images.logo?.exists;

  // Auto-enrich artist if they don't have hero images yet
  useAutoEnrichArtist(album.artistId, hasHeroImages);

  const handlePlay = () => {
    onPlay?.();
    console.log('Playing album:', album.id);
  };

  const handleNext = () => {
    onNext?.();
  };

  const handlePrevious = () => {
    onPrevious?.();
  };

  const coverUrl = getCoverUrl(album.coverImage);

  // Use Fanart.tv background if available, fallback to album cover
  const hasBackground = artistImages?.images.background?.exists;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(album.artistId, 'background')
    : (album.backgroundImage || coverUrl);

  // Check if artist logo is available
  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(album.artistId, 'logo') : null;

  return (
    <section className={styles.heroSection}>
      {/* Background Image with blur effect */}
      <div
        className={styles.heroSection__background}
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          // If using Fanart background (artist photo), show top portion for faces
          // If using album cover, keep centered
          backgroundPosition: hasBackground ? 'center top' : 'center center',
        }}
      />

      {/* Navigation Buttons */}
      <button
        className={styles.heroSection__navButton}
        onClick={handlePrevious}
        aria-label="Previous featured album"
      >
        <ChevronLeft size={32} />
      </button>

      <button
        className={`${styles.heroSection__navButton} ${styles['heroSection__navButton--next']}`}
        onClick={handleNext}
        aria-label="Next featured album"
      >
        <ChevronRight size={32} />
      </button>

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
          {/* Artist name or logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={album.artist}
              className={styles.heroSection__artistLogo}
              onError={(e) => {
                // Fallback to text if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const textElement = target.nextElementSibling as HTMLElement;
                if (textElement) {
                  textElement.style.display = 'block';
                }
              }}
            />
          ) : null}
          <h1
            className={styles.heroSection__artistName}
            style={{ display: logoUrl ? 'none' : 'block' }}
          >
            {album.artist}
          </h1>

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
