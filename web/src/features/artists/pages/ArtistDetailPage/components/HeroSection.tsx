import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArtistOptionsMenu } from '../../../components';
import { useImagePreload } from '../../../hooks';
import { formatPlayCount } from '@shared/utils/format';
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
  onChangeBanner: () => void;
  onAdjustPosition: () => void;
  onChangeLogo: () => void;
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
  onChangeBanner,
  onAdjustPosition,
  onChangeLogo,
}: HeroSectionProps) {
  const { t } = useTranslation();
  const [profileFailed, setProfileFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Resetear estado de error cuando cambia la URL (nueva imagen subida)
  useEffect(() => {
    setProfileFailed(false);
  }, [profileUrl]);
  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

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
            backgroundPosition:
              artist?.backgroundPosition || (hasBackground ? 'center top' : 'center center'),
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
            onChangeBanner={onChangeBanner}
            onAdjustPosition={onAdjustPosition}
            onChangeLogo={onChangeLogo}
            hasBackground={backgroundUrl !== undefined && hasBackground}
          />
        </div>
      )}

      <div className={styles.artistDetailPage__heroContent}>
        {/* Artist Avatar/Profile */}
        <div className={styles.artistDetailPage__avatarContainer}>
          {profileUrl && !profileFailed ? (
            <img
              key={`${profileUrl}-${profileRenderKey}`}
              src={profileUrl}
              alt={artist.name}
              className={styles.artistDetailPage__avatar}
              onClick={onAvatarClick}
              onError={() => setProfileFailed(true)}
            />
          ) : (
            <div className={styles.artistDetailPage__avatarFallback}>{initials}</div>
          )}
          {/* Desktop: Admin Options Menu near avatar */}
          {isAdmin && (
            <ArtistOptionsMenu
              onChangeProfile={onChangeProfile}
              onChangeBackground={onChangeBackground}
              onChangeBanner={onChangeBanner}
              onAdjustPosition={onAdjustPosition}
              onChangeLogo={onChangeLogo}
              hasBackground={backgroundUrl !== undefined && hasBackground}
            />
          )}
        </div>

        {/* Artist Info */}
        <div className={styles.artistDetailPage__info}>
          {/* Logo or Name */}
          {logoUrl && !logoFailed ? (
            <img
              key={`${logoUrl}-${logoRenderKey}`}
              src={logoUrl}
              alt={artist.name}
              className={styles.artistDetailPage__logo}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <h1 className={styles.artistDetailPage__name}>{artist.name}</h1>
          )}

          {/* Stats */}
          <div className={styles.artistDetailPage__stats}>
            <span>{t('artists.albumCount', { count: artist.albumCount })}</span>
            <span>•</span>
            <span>{t('artists.songCount', { count: artist.songCount })}</span>
            {artistStats && artistStats.totalPlays > 0 && (
              <>
                <span>•</span>
                <span>
                  {t('artists.playsCount', { count: formatPlayCount(artistStats.totalPlays) })}
                </span>
                <span>•</span>
                <span>{t('artists.listenerCount', { count: artistStats.uniqueListeners })}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
