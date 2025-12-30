import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Waves } from 'lucide-react';
import { getAutoPlaylists } from '@shared/services/recommendations.service';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import styles from './DailyRedirect.module.css';

/**
 * DailyRedirect Component
 * Automatically loads the daily Wave Mix playlist and redirects to its detail page
 */
export function DailyRedirect() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAndRedirect = async () => {
      try {
        const playlists = await getAutoPlaylists();
        const waveMixPlaylist = playlists.find(p => p.type === 'wave-mix');

        if (waveMixPlaylist) {
          safeSessionStorage.setItem('currentPlaylist', JSON.stringify(waveMixPlaylist));
          safeSessionStorage.setItem('playlistReturnPath', '/');
          setLocation(`/wave-mix/${waveMixPlaylist.id}`, { replace: true });
        } else {
          setError('No hay playlist diaria disponible');
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Failed to load daily mix:', err);
        }
        setError('Error al cargar la playlist diaria');
      }
    };

    loadAndRedirect();
  }, [setLocation]);

  if (error) {
    return (
      <div className={styles.dailyRedirect}>
        <p className={styles.dailyRedirect__error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.dailyRedirect}>
      <Waves size={48} className={styles.dailyRedirect__icon} />
      <p className={styles.dailyRedirect__text}>Cargando tu Wave Mix diario...</p>
    </div>
  );
}

export default DailyRedirect;
