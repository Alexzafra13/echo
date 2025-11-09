import { useParams, useLocation } from 'wouter';
import { BookOpen, Image } from 'lucide-react';
import { useState } from 'react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, AlbumGrid } from '@features/home/components';
import { ArtistAvatarSelectorModal } from '@features/admin/components/ArtistAvatarSelectorModal';
import { useArtist } from '../../hooks';
import { useAlbums } from '@features/home/hooks';
import { useArtistImages, getArtistImageUrl, useAutoEnrichArtist } from '@features/home/hooks';
import { useAuth, useArtistMetadataSync, useAlbumMetadataSync } from '@shared/hooks';
import { getArtistInitials } from '../../utils/artist-image.utils';
import styles from './ArtistDetailPage.module.css';

/**
 * ArtistDetailPage Component
 * Displays artist detail with biography, stats, and albums
 */
export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const { user } = useAuth();

  // Real-time synchronization via WebSocket for artist images and album covers
  useArtistMetadataSync(id);
  useAlbumMetadataSync(undefined, id); // Sync albums for this artist

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

  // Helper to format biography with drop cap
  const formatBiographyWithDropCap = (text: string) => {
    if (!text || text.length === 0) return text;
    const firstChar = text.charAt(0);
    const restOfText = text.slice(1);
    return (
      <>
        <span className={styles.artistDetailPage__dropCap}>{firstChar}</span>
        {restOfText}
      </>
    );
  };

  if (loadingArtist) {
    return (
      <div className={styles.artistDetailPage}>
        <Sidebar />
        <main className={styles.artistDetailPage__main}>
          <Header showBackButton />
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
          <Header showBackButton />
          <div className={styles.artistDetailPage__error}>
            Error al cargar artista
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.artistDetailPage}>
      <Sidebar />

      <main className={styles.artistDetailPage__main}>
        <Header showBackButton />

        <div className={styles.artistDetailPage__content}>
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
                    onClick={() => setIsAvatarModalOpen(true)}
                  />
                ) : (
                  <div className={styles.artistDetailPage__avatarFallback}>
                    {initials}
                  </div>
                )}
                {user?.isAdmin && (
                  <button
                    className={styles.artistDetailPage__changeAvatarBtn}
                    onClick={() => setIsAvatarSelectorOpen(true)}
                    title="Cambiar imagen del artista"
                  >
                    <Image size={16} />
                  </button>
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
              <div className={styles.artistDetailPage__biographyHeader}>
                <BookOpen size={24} className={styles.artistDetailPage__biographyIcon} />
                <h2 className={styles.artistDetailPage__sectionTitle}>Biografía</h2>
              </div>

              <div className={styles.artistDetailPage__biographyContent}>
                <div className={`${styles.artistDetailPage__biographyText} ${
                  !isBioExpanded && artist.biography.length > 500 ? styles.artistDetailPage__biographyText__collapsed : ''
                }`}>
                  {formatBiographyWithDropCap(artist.biography)}
                </div>

                {artist.biography.length > 500 && (
                  <button
                    className={styles.artistDetailPage__biographyToggle}
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                  >
                    {isBioExpanded ? 'Leer menos' : 'Leer más'}
                  </button>
                )}

                {artist.biographySource && (
                  <div className={styles.artistDetailPage__biographySource}>
                    Fuente: {artist.biographySource === 'wikipedia' ? 'Wikipedia' :
                            artist.biographySource === 'lastfm' ? 'Last.fm' :
                            artist.biographySource}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* No Biography Placeholder */}
          {!artist.biography && (
            <section className={styles.artistDetailPage__biography}>
              <div className={styles.artistDetailPage__biographyHeader}>
                <BookOpen size={24} className={styles.artistDetailPage__biographyIcon} />
                <h2 className={styles.artistDetailPage__sectionTitle}>Biografía</h2>
              </div>
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

      {/* Avatar Modal/Lightbox */}
      {isAvatarModalOpen && profileUrl && (
        <div
          className={styles.artistDetailPage__imageModal}
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div className={styles.artistDetailPage__imageModalContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={profileUrl}
              alt={artist.name}
              className={styles.artistDetailPage__imageModalImage}
            />
          </div>
        </div>
      )}

      {/* Avatar Selector Modal */}
      {isAvatarSelectorOpen && artist && (
        <ArtistAvatarSelectorModal
          artistId={artist.id}
          artistName={artist.name}
          onClose={() => setIsAvatarSelectorOpen(false)}
          onSuccess={() => {
            // WebSocket will automatically sync the changes via useArtistMetadataSync
            // No need for window.location.reload() - React Query handles it
            setIsAvatarSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
}
