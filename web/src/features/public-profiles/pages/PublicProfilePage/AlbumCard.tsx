import { Link } from 'wouter';
import { Disc } from 'lucide-react';
import type { TopAlbum } from '../../services/public-profiles.service';
import styles from './PublicProfilePage.module.css';

interface AlbumCardProps {
  album: TopAlbum;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link href={`/album/${album.id}`} className={styles.publicProfilePage__albumCard}>
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
      <p className={styles.publicProfilePage__albumMeta}>
        {album.playCount} reproducciones
      </p>
    </Link>
  );
}
