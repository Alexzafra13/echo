import { ListMusic } from 'lucide-react';
import { PlaylistCover } from '@features/recommendations/components';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import styles from '../ArtistDetailPage.module.css';

interface AutoPlaylist {
  id: string;
  name: string;
  type: string;
  coverColor?: string;
  coverImageUrl?: string;
  metadata: {
    artistId?: string;
    artistName?: string;
  };
  tracks: { id: string }[];
}

interface UserPlaylist {
  id: string;
  name: string;
  songCount: number;
  albumIds?: string[];
}

interface PlaylistsSectionProps {
  artistName: string;
  autoPlaylists: AutoPlaylist[];
  userPlaylists: UserPlaylist[];
  onNavigate: (path: string) => void;
}

/**
 * PlaylistsSection - Displays playlists containing the artist's tracks
 */
export function PlaylistsSection({
  artistName,
  autoPlaylists,
  userPlaylists,
  onNavigate,
}: PlaylistsSectionProps) {
  if (autoPlaylists.length === 0 && userPlaylists.length === 0) {
    return null;
  }

  return (
    <section className={styles.artistDetailPage__playlists}>
      <div className={styles.artistDetailPage__sectionHeader}>
        <ListMusic size={24} className={styles.artistDetailPage__sectionIcon} />
        <h2 className={styles.artistDetailPage__sectionTitle}>Playlists con {artistName}</h2>
      </div>
      <div className={styles.artistDetailPage__playlistsGrid}>
        {/* Auto-generated playlists (Wave Mix) */}
        {autoPlaylists.map((playlist) => (
          <div
            key={`auto-${playlist.id}`}
            className={styles.artistDetailPage__playlistCard}
            onClick={() => onNavigate(`/playlists/auto/${playlist.id}`)}
          >
            <div className={styles.artistDetailPage__playlistCover}>
              <PlaylistCover
                type={playlist.type}
                name={playlist.name}
                coverColor={playlist.coverColor}
                coverImageUrl={playlist.coverImageUrl}
                artistName={playlist.metadata.artistName}
                size="medium"
              />
            </div>
            <div className={styles.artistDetailPage__playlistInfo}>
              <span className={styles.artistDetailPage__playlistName}>{playlist.name}</span>
              <span className={styles.artistDetailPage__playlistMeta}>
                {playlist.tracks.length} canciones
              </span>
            </div>
          </div>
        ))}
        {/* User public playlists */}
        {userPlaylists.map((playlist) => (
          <div
            key={`user-${playlist.id}`}
            className={styles.artistDetailPage__playlistCard}
            onClick={() => onNavigate(`/playlists/${playlist.id}`)}
          >
            <div className={styles.artistDetailPage__playlistCover}>
              <PlaylistCoverMosaic
                albumIds={playlist.albumIds || []}
                playlistName={playlist.name}
              />
            </div>
            <div className={styles.artistDetailPage__playlistInfo}>
              <span className={styles.artistDetailPage__playlistName}>{playlist.name}</span>
              <span className={styles.artistDetailPage__playlistMeta}>
                {playlist.songCount} canciones
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
