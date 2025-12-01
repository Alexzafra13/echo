import { Shuffle, Calendar, Users, RefreshCw } from 'lucide-react';
import { ActionCard } from '../ActionCard';
import { useShufflePlay } from '@shared/hooks';
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
  const { shufflePlay, isLoading: shuffleLoading } = useShufflePlay();

  // TODO: Implement daily recommendations hook
  const handleDailyRecommendations = () => {
    // Placeholder - will navigate to daily recommendations
    console.log('Daily recommendations clicked');
  };

  // TODO: Implement social features hook
  const handleSocial = () => {
    // Placeholder - will navigate to social features
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

      {/* Daily Recommendations */}
      <ActionCard
        icon={<Calendar size={22} />}
        title="Diario"
        loadingTitle="Cargando..."
        onClick={handleDailyRecommendations}
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
