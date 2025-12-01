import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shuffle, Calendar, Users, RefreshCw } from 'lucide-react';
import { ActionCard } from '../ActionCard';
import { useShufflePlay } from '@shared/hooks';
import { getAutoPlaylists } from '@shared/services/recommendations.service';
import styles from './ActionCardsRow.module.css';

export interface ActionCardsRowProps {
  /** Additional CSS class */
  className?: string;
}

/**
 * ActionCardsRow Component
 * A row of 3 action cards: Shuffle, Daily Recommendations, Social
 * Responsive layout that adapts to all screen sizes consistently
 */
export function ActionCardsRow({ className }: ActionCardsRowProps) {
  const [, setLocation] = useLocation();
  const { shufflePlay, isLoading: shuffleLoading } = useShufflePlay();
  const [dailyLoading, setDailyLoading] = useState(false);

  const handleDailyMix = async () => {
    setDailyLoading(true);
    try {
      const playlists = await getAutoPlaylists();
      const waveMixPlaylist = playlists.find(p => p.type === 'wave-mix');

      if (waveMixPlaylist) {
        sessionStorage.setItem('currentPlaylist', JSON.stringify(waveMixPlaylist));
        sessionStorage.setItem('playlistReturnPath', '/');
        setLocation(`/wave-mix/${waveMixPlaylist.id}`);
      } else {
        // Fallback to legacy page if no wave-mix playlist found
        setLocation('/daily-mix');
      }
    } catch (error) {
      console.error('Failed to load daily mix:', error);
      setLocation('/daily-mix');
    } finally {
      setDailyLoading(false);
    }
  };

  // TODO: Implement social features
  const handleSocial = () => {
    console.log('Social clicked');
  };

  return (
    <div className={`${styles.actionCardsRow} ${className || ''}`}>
      {/* Shuffle / Random Play */}
      <ActionCard
        icon={<Shuffle size={22} />}
        loadingIcon={<RefreshCw size={22} className={styles.spinning} />}
        title="Aleatorio"
        loadingTitle="Cargando..."
        onClick={shufflePlay}
        isLoading={shuffleLoading}
        customGradient={['#1a1a2e', '#16213e']}
      />

      {/* Wave Mix - Daily Recommendations */}
      <ActionCard
        icon={<Calendar size={22} />}
        loadingIcon={<RefreshCw size={22} className={styles.spinning} />}
        title="Wave Mix Diario"
        loadingTitle="Cargando..."
        onClick={handleDailyMix}
        isLoading={dailyLoading}
        customGradient={['#2d1f3d', '#1a1a2e']}
      />

      {/* Social Features */}
      <ActionCard
        icon={<Users size={22} />}
        title="Social"
        loadingTitle="Cargando..."
        onClick={handleSocial}
        customGradient={['#1f2d3d', '#1a2a1a']}
      />
    </div>
  );
}

export default ActionCardsRow;
