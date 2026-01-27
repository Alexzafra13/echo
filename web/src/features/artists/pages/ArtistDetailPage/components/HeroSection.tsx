import { ArtistOptionsMenu } from '../../../components';
import { useImagePreload } from '../../../hooks';
import styles from '../ArtistDetailPage.module.css';

interface HeroSectionProps {
  artist: {
    id: string;
    name: string;
    albumCount: number;
    songCount: number;
    backgroundPosition?: string;
  };
  artistStats?: {
    totalPlays: number;
    uniqueListeners: number;
  } | null;
  profileUrl: string | null;
  backgroundUrl: string | undefined;
  logoUrl: string | null;
  hasBackground: boolean;
  initials: string;
  isAdmin: boolean;
  onAvatarClick: () => void;
  onChangeProfile: () => void;
  onChangeBackground: () => void;
  onAdjustPosition: () => void;
  onChangeLogo: () => void;
}

/**
 * Formats a play count number to a human-readable string
 * e.g., 1500000 -> "1.5M", 15000 -> "15.0K"
 */
function formatPlayCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/**
 * HeroSection - Displays the artist hero with background, avatar, logo and stats
 */
export function HeroSection({
  artist,
  artistStats,
  profileUrl,
  backgroundUrl,
  logoUrl,
  hasBackground,
  initials,
  isAdmin,
  onAvatarClick,
  onChangeProfile,
  onChangeBackground,
  onAdjustPosition,
  onChangeLogo,
}: HeroSectionProps) {
  // Preload images to force browser cache refresh
  const { renderKey: imageRenderKey } = useImagePreload({
    url: backgroundUrl,
    name: 'background',
  });

  const { renderKey: logoRenderKey } = useImagePreload({
    url: logoUrl,
    name: 'logo',
  });

  const { renderKey: profileRenderKey } = useImagePreload({
    url: profileUrl,
    name: 'profile',
  });

  return (
    <section className={styles.artistDetailPage__hero}>
      {/* Background - Desktop uses background/banner, Mobile uses profile for Spotify-style look */}
      {backgroundUrl && (
        <div
          key={`${backgroundUrl}-${imageRenderKey}`}
          className={`${styles.artistDetailPage__background} ${styles.artistDetailPage__backgroundDesktop}`}
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundPosition: artist?.backgroundPosition ||
              (hasBackground ? 'center top' : 'center center'),
          }}
        />
      )}
      {/* Mobile-only: Profile image as hero background (Spotify app style) */}
      {(profileUrl || backgroundUrl) && (
        <div
          key={`mobile-${profileUrl || backgroundUrl}-${profileRenderKey}`}
          className={`${styles.artistDetailPage__background} ${styles.artistDetailPage__backgroundMobile}`}
          style={{
            backgroundImage: `url(${profileUrl || backgroundUrl})`,
            backgroundPosition: 'center top',
          }}
        />
      )}

      {/* Mobile-only: Admin Options Menu at top-right */}
      {isAdmin && (
        <div className={styles.artistDetailPage__optionsMenuMobile}>
          <ArtistOptionsMenu
            onChangeProfile={onChangeProfile}
            onChangeBackground={onChangeBackground}
            onAdjustPosition={onAdjustPosition}
            onChangeLogo={onChangeLogo}
            hasBackground={backgroundUrl !== undefined && hasBackground}
          />
        </div>
      )}

      <div className={styles.artistDetailPage__heroContent}>
        {/* Artist Avatar/Profile */}
        <div className={styles.artistDetailPage__avatarContainer}>
          {profileUrl ? (
            <img
              key={`${profileUrl}-${profileRenderKey}`}
              src={profileUrl}
              alt={artist.name}
              className={styles.artistDetailPage__avatar}
              onClick={onAvatarClick}
            />
          ) : (
            <div className={styles.artistDetailPage__avatarFallback}>
              {initials}
            </div>
          )}
          {/* Desktop: Admin Options Menu near avatar */}
          {isAdmin && (
            <ArtistOptionsMenu
              onChangeProfile={onChangeProfile}
              onChangeBackground={onChangeBackground}
              onAdjustPosition={onAdjustPosition}
              onChangeLogo={onChangeLogo}
              hasBackground={backgroundUrl !== undefined && hasBackground}
            />
          )}
        </div>

        {/* Artist Info */}
        <div className={styles.artistDetailPage__info}>
          {/* Logo or Name */}
          {logoUrl ? (
            <img
              key={`${logoUrl}-${logoRenderKey}`}
              src={logoUrl}
              alt={artist.name}
              className={styles.artistDetailPage__logo}
            />
          ) : (
            <h1 className={styles.artistDetailPage__name}>{artist.name}</h1>
          )}

          {/* Stats */}
          <div className={styles.artistDetailPage__stats}>
            <span>{artist.albumCount} {artist.albumCount === 1 ? 'álbum' : 'álbumes'}</span>
            <span>•</span>
            <span>{artist.songCount} {artist.songCount === 1 ? 'canción' : 'canciones'}</span>
            {artistStats && artistStats.totalPlays > 0 && (
              <>
                <span>•</span>
                <span>{formatPlayCount(artistStats.totalPlays)} reproducciones</span>
                <span>•</span>
                <span>{artistStats.uniqueListeners} {artistStats.uniqueListeners === 1 ? 'oyente' : 'oyentes'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
