import { Link } from 'wouter';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import { formatDuration } from '@shared/utils/format';
import type { PublicPlaylist } from '../../services/public-profiles.service';
import styles from './PublicProfilePage.module.css';

interface PlaylistCardProps {
  playlist: PublicPlaylist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link href={`/playlists/${playlist.id}`} className={styles.publicProfilePage__playlistCard}>
      <div className={styles.publicProfilePage__playlistCoverWrapper}>
        <PlaylistCoverMosaic albumIds={playlist.albumIds} playlistName={playlist.name} />
      </div>
      <h3 className={styles.publicProfilePage__playlistName}>{playlist.name}</h3>
      <p className={styles.publicProfilePage__playlistMeta}>
        {playlist.songCount} canciones · {formatDuration(playlist.duration)}
      </p>
    </Link>
  );
}
