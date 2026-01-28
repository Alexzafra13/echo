import { useLocation } from 'wouter';
import { RadioStationCard } from '@features/radio/components/RadioStationCard/RadioStationCard';
import type { RadioStation } from '@features/radio/types';
import type { RadioMetadata } from '@features/player/context/PlayerContext';
import styles from './HomePage.module.css';

interface FavoriteRadiosSectionProps {
  stations: RadioStation[];
  maxItems: number;
  currentRadioStation: RadioStation | null;
  isPlaying: boolean;
  isRadioMode: boolean;
  radioMetadata: RadioMetadata | null;
  onPlay: (station: RadioStation) => void;
  onRemoveFavorite: (stationId: string) => void;
}

export function FavoriteRadiosSection({
  stations,
  maxItems,
  currentRadioStation,
  isPlaying,
  isRadioMode,
  radioMetadata,
  onPlay,
  onRemoveFavorite,
}: FavoriteRadiosSectionProps) {
  const [, setLocation] = useLocation();

  if (stations.length === 0) return null;

  return (
    <section className={styles.homeSection}>
      <div className={styles.homeSection__header}>
        <h2 className={styles.homeSection__title}>Radios Favoritas</h2>
        <button
          className={styles.homeSection__viewAll}
          onClick={() => setLocation('/radio')}
        >
          Ver todo →
        </button>
      </div>
      <div className={styles.radiosGrid}>
        {stations
          .filter((station) => station.id)
          .slice(0, maxItems)
          .map((station) => (
            <RadioStationCard
              key={station.id}
              station={station}
              isFavorite={true}
              isPlaying={isRadioMode && isPlaying && currentRadioStation?.id === station.id}
              currentMetadata={currentRadioStation?.id === station.id ? radioMetadata : null}
              onPlay={() => onPlay(station)}
              onToggleFavorite={() => onRemoveFavorite(station.id!)}
            />
          ))}
      </div>
    </section>
  );
}
