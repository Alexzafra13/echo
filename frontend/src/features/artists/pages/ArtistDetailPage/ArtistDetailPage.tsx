import { useParams, useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, AlbumGrid } from '@features/home/components';
import { useArtist } from '../../hooks';
import { useAlbums } from '@features/home/hooks';
import { useArtistImages, getArtistImageUrl, useAutoEnrichArtist } from '@features/home/hooks';
import { getArtistInitials } from '../../utils/artist-image.utils';
import styles from './ArtistDetailPage.module.css';

/**
 * ArtistDetailPage Component
 * Displays artist detail with biography, stats, and albums
 */
export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // Fetch artist details
  const { data: artist, isLoading: loadingArtist, error: artistError } = useArtist(id);

  // Fetch all albums to filter by this artist
  const { data: allAlbumsData } = useAlbums({ skip: 0, take: 500 });

  // Fetch artist images from Fanart.tv
  const { data: artistImages } = useArtistImages(id);

  // Check if artist has images
  const hasHeroImages = artistImages?.images.background?.exists || artistImages?.images.banner?.exists;

  // Auto-enrich artist if they don't have biography or hero images yet
  useAutoEnrichArtist(id, hasHeroImages);

  // Filter albums by this artist
  const artistAlbums = allAlbumsData?.data.filter(album => album.artistId === id) || [];

  // Get background image
  const hasBackground = artistImages?.images.background?.exists || artistImages?.images.banner?.exists;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(id!, artistImages?.images.background?.exists ? 'background' : 'banner')
    : artistAlbums[0]?.coverImage; // Fallback to first album cover

  // Get logo or use text
  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(id!, 'logo') : null;

  // Get profile image for avatar (prioritize DB images first, then Fanart.tv)
  const profileUrl = artist?.largeImageUrl ||
                     artist?.mediumImageUrl ||
                     artist?.smallImageUrl ||
                     (artistImages?.images.profileLarge?.exists ? getArtistImageUrl(id!, 'profile-large') : null) ||
                     (artistImages?.images.profileMedium?.exists ? getArtistImageUrl(id!, 'profile-medium') : null);

  const initials = artist ? getArtistInitials(artist.name) : '';

  if (loadingArtist) {
    return (
      <div className={styles.artistDetailPage}>
        <Sidebar />
        <main className={styles.artistDetailPage__main}>
          <Header />
          <div className={styles.artistDetailPage__loading}>Cargando artista...</div>
        </main>
      </div>
    );
  }

  if (artistError || !artist) {
    return (
      <div className={styles.artistDetailPage}>
        <Sidebar />
        <main className={styles.artistDetailPage__main}>
          <Header />
          <div className={styles.artistDetailPage__error}>
            Error al cargar artista
            <button onClick={() => setLocation('/artists')}>Volver a artistas</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.artistDetailPage}>
      <Sidebar />

      <main className={styles.artistDetailPage__main}>
        <Header />

        <div className={styles.artistDetailPage__content}>
          {/* Back Button */}
          <button
            className={styles.artistDetailPage__backButton}
            onClick={() => setLocation('/artists')}
          >
            <ArrowLeft size={20} />
            Artistas
          </button>

          {/* Hero Section */}
          <section className={styles.artistDetailPage__hero}>
            {/* Background */}
            {backgroundUrl && (
              <div
                className={styles.artistDetailPage__background}
                style={{
                  backgroundImage: `url(${backgroundUrl})`,
                  // If using Fanart background (artist photo), show top portion for faces
                  // If using album cover, keep centered
                  backgroundPosition: hasBackground ? 'center top' : 'center center',
                }}
              />
            )}

            <div className={styles.artistDetailPage__heroContent}>
              {/* Artist Avatar/Profile */}
              <div className={styles.artistDetailPage__avatarContainer}>
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt={artist.name}
                    className={styles.artistDetailPage__avatar}
                  />
                ) : (
                  <div className={styles.artistDetailPage__avatarFallback}>
                    {initials}
                  </div>
                )}
              </div>

              {/* Artist Info */}
              <div className={styles.artistDetailPage__info}>
                {/* Logo or Name */}
                {logoUrl ? (
                  <img
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
                </div>
              </div>
            </div>
          </section>

          {/* Biography Section */}
          {artist.biography && (
            <section className={styles.artistDetailPage__biography}>
              <h2 className={styles.artistDetailPage__sectionTitle}>Biografía</h2>
              <p className={styles.artistDetailPage__biographyText}>{artist.biography}</p>
            </section>
          )}

          {/* No Biography Placeholder */}
          {!artist.biography && (
            <section className={styles.artistDetailPage__biography}>
              <h2 className={styles.artistDetailPage__sectionTitle}>Biografía</h2>
              <p className={styles.artistDetailPage__biographyPlaceholder}>
                No hay biografía disponible para este artista.
              </p>
            </section>
          )}

          {/* Albums Section */}
          {artistAlbums.length > 0 && (
            <section className={styles.artistDetailPage__albums}>
              <AlbumGrid
                title={`Álbumes de ${artist.name}`}
                albums={artistAlbums}
              />
            </section>
          )}

          {/* No Albums */}
          {artistAlbums.length === 0 && (
            <section className={styles.artistDetailPage__albums}>
              <h2 className={styles.artistDetailPage__sectionTitle}>Álbumes</h2>
              <p className={styles.artistDetailPage__emptyAlbums}>
                No hay álbumes disponibles para este artista.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
