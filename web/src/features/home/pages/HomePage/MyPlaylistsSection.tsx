import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import type { Playlist } from '@features/playlists/types';
import styles from './HomePage.module.css';

interface MyPlaylistsSectionProps {
  playlists: Playlist[];
  maxItems: number;
}

export function MyPlaylistsSection({ playlists, maxItems }: MyPlaylistsSectionProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  if (playlists.length === 0) return null;

  return (
    <section className={styles.homeSection}>
      <div className={styles.homeSection__header}>
        <h2 className={styles.homeSection__title}>{t('home.myPlaylists')}</h2>
        <button className={styles.homeSection__viewAll} onClick={() => setLocation('/playlists')}>
          {t('home.viewAll')}
        </button>
      </div>
      <div className={styles.playlistsGrid}>
        {playlists.slice(0, maxItems).map((playlist) => (
          <div
            key={playlist.id}
            className={styles.playlistCard}
            onClick={() => setLocation(`/playlists/${playlist.id}`)}
          >
            <div className={styles.playlistCard__cover}>
              <PlaylistCoverMosaic
                albumIds={playlist.albumIds || []}
                playlistName={playlist.name}
              />
            </div>
            <div className={styles.playlistCard__info}>
              <h3 className={styles.playlistCard__title}>{playlist.name}</h3>
              <p className={styles.playlistCard__meta}>
                {t('artists.songCount', { count: playlist.songCount })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
