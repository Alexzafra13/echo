import { useParams } from 'wouter';
import { Link } from 'wouter';
import { Lock, Music, Disc, User as UserIcon, ListMusic, Calendar } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import { usePublicProfile } from '../../hooks';
import { formatDate, formatDuration } from '@shared/utils/format';
import styles from './PublicProfilePage.module.css';

/**
 * PublicProfilePage Component
 * Shows public profile of a user with top artists, albums, tracks, and playlists
 */
export function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId || '';
  const { data: profile, isLoading, error } = usePublicProfile(userId);

  const getUserInitials = (name?: string, username?: string) => {
    const displayName = name || username || 'U';
    return displayName.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className={styles.publicProfilePage}>
        <Sidebar />
        <main className={styles.publicProfilePage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.publicProfilePage__content}>
            <div className={styles.publicProfilePage__loading}>
              <div>Cargando perfil...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.publicProfilePage}>
        <Sidebar />
        <main className={styles.publicProfilePage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.publicProfilePage__content}>
            <div className={styles.publicProfilePage__privateMessage}>
              <div className={styles.publicProfilePage__privateIcon}>
                <UserIcon size={40} />
              </div>
              <h2>Usuario no encontrado</h2>
              <p>El usuario que buscas no existe o ha sido eliminado.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { user, topTracks, topArtists, topAlbums, playlists, settings } = profile;

  // If profile is private, show minimal info
  if (!user.isPublicProfile) {
    return (
      <div className={styles.publicProfilePage}>
        <Sidebar />
        <main className={styles.publicProfilePage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.publicProfilePage__content}>
            {/* Profile Header - Minimal */}
            <div className={styles.publicProfilePage__profileHeader}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.username}
                  className={styles.publicProfilePage__avatar}
                />
              ) : (
                <div className={styles.publicProfilePage__avatarPlaceholder}>
                  {getUserInitials(user.name, user.username)}
                </div>
              )}
              <div className={styles.publicProfilePage__info}>
                <h1 className={styles.publicProfilePage__name}>
                  {user.name || user.username}
                </h1>
                {user.name && (
                  <p className={styles.publicProfilePage__username}>@{user.username}</p>
                )}
              </div>
            </div>

            {/* Private Message */}
            <div className={styles.publicProfilePage__privateMessage}>
              <div className={styles.publicProfilePage__privateIcon}>
                <Lock size={40} />
              </div>
              <h2>Perfil privado</h2>
              <p>Este usuario ha configurado su perfil como privado.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.publicProfilePage}>
      <Sidebar />
      <main className={styles.publicProfilePage__main}>
        <Header showBackButton disableSearch />
        <div className={styles.publicProfilePage__content}>
          <div className={styles.publicProfilePage__contentInner}>
          {/* Profile Header */}
          <div className={styles.publicProfilePage__profileHeader}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || user.username}
                className={styles.publicProfilePage__avatar}
              />
            ) : (
              <div className={styles.publicProfilePage__avatarPlaceholder}>
                {getUserInitials(user.name, user.username)}
              </div>
            )}
            <div className={styles.publicProfilePage__info}>
              <h1 className={styles.publicProfilePage__name}>
                {user.name || user.username}
              </h1>
              {user.name && (
                <p className={styles.publicProfilePage__username}>@{user.username}</p>
              )}
              {user.bio && (
                <p className={styles.publicProfilePage__bio}>{user.bio}</p>
              )}
              <div className={styles.publicProfilePage__memberSince}>
                <Calendar size={14} />
                Miembro desde {formatDate(user.memberSince)}
              </div>
            </div>
          </div>

          {/* Top Artists */}
          {settings.showTopArtists && topArtists && topArtists.length > 0 && (
            <section className={styles.publicProfilePage__section}>
              <div className={styles.publicProfilePage__sectionHeader}>
                <h2 className={styles.publicProfilePage__sectionTitle}>
                  <UserIcon size={22} />
                  Artistas favoritos
                </h2>
              </div>
              <div className={styles.publicProfilePage__scrollContainer}>
                {topArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className={styles.publicProfilePage__artistCard}
                  >
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className={styles.publicProfilePage__artistImage}
                      />
                    ) : (
                      <div className={styles.publicProfilePage__artistPlaceholder}>
                        <UserIcon size={40} />
                      </div>
                    )}
                    <h3 className={styles.publicProfilePage__artistName}>{artist.name}</h3>
                    <p className={styles.publicProfilePage__artistPlays}>
                      {artist.playCount} reproducciones
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Top Albums */}
          {settings.showTopAlbums && topAlbums && topAlbums.length > 0 && (
            <section className={styles.publicProfilePage__section}>
              <div className={styles.publicProfilePage__sectionHeader}>
                <h2 className={styles.publicProfilePage__sectionTitle}>
                  <Disc size={22} />
                  Álbumes favoritos
                </h2>
              </div>
              <div className={styles.publicProfilePage__scrollContainer}>
                {topAlbums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className={styles.publicProfilePage__albumCard}
                  >
                    {album.coverUrl ? (
                      <img
                        src={album.coverUrl}
                        alt={album.name}
                        className={styles.publicProfilePage__albumCover}
                      />
                    ) : (
                      <div className={styles.publicProfilePage__albumPlaceholder}>
                        <Disc size={48} />
                      </div>
                    )}
                    <h3 className={styles.publicProfilePage__albumName}>{album.name}</h3>
                    {album.artistName && (
                      <p className={styles.publicProfilePage__albumArtist}>{album.artistName}</p>
                    )}
                    <p className={styles.publicProfilePage__albumPlays}>
                      {album.playCount} reproducciones
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Top Tracks */}
          {settings.showTopTracks && topTracks && topTracks.length > 0 && (
            <section className={styles.publicProfilePage__section}>
              <div className={styles.publicProfilePage__sectionHeader}>
                <h2 className={styles.publicProfilePage__sectionTitle}>
                  <Music size={22} />
                  Canciones más escuchadas
                </h2>
              </div>
              <div className={styles.publicProfilePage__trackList}>
                {topTracks.map((track, index) => (
                  <Link
                    key={track.id}
                    href={track.albumId ? `/album/${track.albumId}` : '#'}
                    className={styles.publicProfilePage__trackItem}
                  >
                    <span className={styles.publicProfilePage__trackNumber}>
                      {index + 1}
                    </span>
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className={styles.publicProfilePage__trackCover}
                      />
                    ) : (
                      <div className={styles.publicProfilePage__trackCoverPlaceholder}>
                        <Music size={20} />
                      </div>
                    )}
                    <div className={styles.publicProfilePage__trackInfo}>
                      <h3 className={styles.publicProfilePage__trackTitle}>{track.title}</h3>
                      {track.artistName && (
                        <p className={styles.publicProfilePage__trackArtist}>
                          {track.artistName}
                        </p>
                      )}
                    </div>
                    <span className={styles.publicProfilePage__trackPlays}>
                      {track.playCount} plays
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Public Playlists */}
          {settings.showPlaylists && playlists && playlists.length > 0 && (
            <section className={styles.publicProfilePage__section}>
              <div className={styles.publicProfilePage__sectionHeader}>
                <h2 className={styles.publicProfilePage__sectionTitle}>
                  <ListMusic size={22} />
                  Playlists
                </h2>
              </div>
              <div className={styles.publicProfilePage__playlistGrid}>
                {playlists.map((playlist) => (
                  <Link
                    key={playlist.id}
                    href={`/playlists/${playlist.id}`}
                    className={styles.publicProfilePage__playlistCard}
                  >
                    <div className={styles.publicProfilePage__playlistCoverWrapper}>
                      <PlaylistCoverMosaic
                        albumIds={playlist.albumIds}
                        playlistName={playlist.name}
                      />
                    </div>
                    <div className={styles.publicProfilePage__playlistInfo}>
                      <h3 className={styles.publicProfilePage__playlistName}>
                        {playlist.name}
                      </h3>
                      <p className={styles.publicProfilePage__playlistMeta}>
                        {playlist.songCount} canciones · {formatDuration(playlist.duration)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state if no content */}
          {!topArtists?.length && !topAlbums?.length && !topTracks?.length && !playlists?.length && (
            <div className={styles.publicProfilePage__empty}>
              Este usuario aún no tiene actividad para mostrar.
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
