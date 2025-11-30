import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { usePlayer, Track } from '@features/player';
import { useArtistImages, getArtistImageUrl, useAutoEnrichArtist, useAlbumTracks } from '../../hooks';
import { useArtistMetadataSync, useAlbumMetadataSync } from '@shared/hooks';
import { useArtist } from '@features/artists/hooks';
import type { HeroSectionProps } from '../../types';
import { logger } from '@shared/utils/logger';
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
  const [, setLocation] = useLocation();
  const { playQueue } = usePlayer();

  // Real-time synchronization via WebSocket for artist and album metadata
  useArtistMetadataSync(album.artistId);
  useAlbumMetadataSync(album.id, album.artistId);

  // Fetch artist data for timestamp
  const { data: artist } = useArtist(album.artistId);

  // Fetch artist images from Fanart.tv
  const { data: artistImages } = useArtistImages(album.artistId);

  // Fetch album tracks
  const { data: tracks } = useAlbumTracks(album.id);

  // Check if artist has any hero images (background or logo)
  const hasHeroImages = artistImages?.images.background?.exists || artistImages?.images.logo?.exists;

  // Auto-enrich artist if they don't have hero images yet
  useAutoEnrichArtist(album.artistId, hasHeroImages);

  // Convert API tracks to Player tracks with album cover
  const convertToPlayerTracks = (apiTracks: any[]): Track[] => {
    return apiTracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artistName || album.artist || 'Unknown Artist',
      albumId: album.id,
      albumName: album.title,
      duration: track.duration || 0,
      coverImage: album.coverImage, // Add album cover to each track
    }));
  };

  const handlePlay = () => {
    // Call custom onPlay handler if provided
    onPlay?.();

    // Play album tracks if available
    if (tracks && tracks.length > 0) {
      const playerTracks = convertToPlayerTracks(tracks);
      playQueue(playerTracks, 0);
      logger.debug('Playing album:', album.title, 'with', tracks.length, 'tracks');
    } else {
      logger.warn('No tracks available for album:', album.id);
    }
  };

  const handleNext = () => {
    onNext?.();
  };

  const handlePrevious = () => {
    onPrevious?.();
  };

  const handleAlbumClick = () => {
    setLocation(`/album/${album.id}`);
  };

  const handleArtistClick = () => {
    setLocation(`/artists/${album.artistId}`);
  };

  const coverUrl = getCoverUrl(album.coverImage);

  // Timestamp for cache busting (prefer externalInfoUpdatedAt, fallback to updatedAt)
  const artistTimestamp = artist?.externalInfoUpdatedAt || artist?.updatedAt;

  // Use Fanart.tv background if available, fallback to album cover
  const hasBackground = artistImages?.images.background?.exists;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(album.artistId, 'background', artistTimestamp)
    : (album.backgroundImage || coverUrl);

  // Check if artist logo is available
  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(album.artistId, 'logo', artistTimestamp) : null;

  return (
    <section className={styles.heroSection}>
      {/* Background Image with blur effect */}
      <div
        key={backgroundUrl} // Force re-render when URL changes (timestamp updates)
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
        {/* Album Cover - Clickable */}
        <button
          onClick={handleAlbumClick}
          className={styles.heroSection__albumCoverButton}
          aria-label={`View ${album.title} album`}
        >
          <img
            src={coverUrl}
            alt={album.title}
            className={styles.heroSection__albumCover}
            onError={handleImageError}
          />
        </button>

        {/* Album Info */}
        <div className={styles.heroSection__info}>
          {/* Artist name or logo - Clickable */}
          <button
            onClick={handleArtistClick}
            className={styles.heroSection__artistButton}
            aria-label={`View ${album.artist} artist page`}
          >
            {logoUrl ? (
              <img
                key={logoUrl} // Force re-render when URL changes (timestamp updates)
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
          </button>

          <h2 className={styles.heroSection__albumTitle}>{album.title}</h2>
          <p className={styles.heroSection__meta}>
            {album.year}
            {album.totalTracks && ` • ${album.totalTracks} Songs`}
          </p>

          <button
            onClick={handlePlay}
            className={styles.heroSection__playButton}
            aria-label="Play album"
          >
            <Play size={24} fill="currentColor" strokeWidth={0} className={styles.heroSection__playIcon} />
            <span className={styles.heroSection__playText}>Reproducir</span>
          </button>
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
