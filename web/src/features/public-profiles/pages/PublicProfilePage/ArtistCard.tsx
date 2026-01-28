import { Link } from 'wouter';
import { User as UserIcon } from 'lucide-react';
import type { TopArtist } from '../../services/public-profiles.service';
import styles from './PublicProfilePage.module.css';

interface ArtistCardProps {
  artist: TopArtist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artists/${artist.id}`} className={styles.publicProfilePage__artistCard}>
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
      <p className={styles.publicProfilePage__artistMeta}>Artista</p>
    </Link>
  );
}
