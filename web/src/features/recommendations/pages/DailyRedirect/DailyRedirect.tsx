import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Waves } from 'lucide-react';
import { getAutoPlaylists } from '@shared/services/recommendations.service';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import { logger } from '@shared/utils/logger';
import styles from './DailyRedirect.module.css';

/**
 * DailyRedirect Component
 * Carga automáticamente la playlist diaria Wave Mix y redirige a su página de detalle
 */
export function DailyRedirect() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAndRedirect = async () => {
      try {
        const playlists = await getAutoPlaylists();
        const waveMixPlaylist = playlists.find((p) => p.type === 'wave-mix');

        if (waveMixPlaylist) {
          safeSessionStorage.setItem('currentPlaylist', JSON.stringify(waveMixPlaylist));
          safeSessionStorage.setItem('playlistReturnPath', '/');
          setLocation(`/wave-mix/${waveMixPlaylist.id}`, { replace: true });
        } else {
          setError(t('recommendations.noDailyPlaylist'));
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          logger.error('Failed to load daily mix:', err);
        }
        setError(t('recommendations.errorLoadingDaily'));
      }
    };

    loadAndRedirect();
  }, [setLocation, t]);

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
      <p className={styles.dailyRedirect__text}>{t('recommendations.loadingDailyMix')}</p>
    </div>
  );
}

export default DailyRedirect;
