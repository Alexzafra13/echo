import { useState } from 'react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { RadioStationCard } from '../../components/RadioStationCard/RadioStationCard';
import { usePlayer } from '@features/player/context/PlayerContext';
import {
  useTopVotedStations,
  usePopularStations,
  useFavoriteStations,
  useSaveFavoriteFromApi,
  useDeleteFavoriteStation,
} from '../../hooks';
import { radioService } from '../../services';
import type { RadioBrowserStation } from '../../types';
import styles from './RadioPage.module.css';

/**
 * RadioPage Component
 * Main radio page - displays top voted, popular stations, and user favorites
 */
export default function RadioPage() {
  const { playRadio, currentRadioStation, isPlaying, isRadioMode } = usePlayer();

  const [activeTab, setActiveTab] = useState<'top' | 'popular' | 'favorites'>('top');

  // Fetch stations
  const { data: topVotedStations, isLoading: loadingTopVoted } = useTopVotedStations(20);
  const { data: popularStations, isLoading: loadingPopular } = usePopularStations(20);
  const { data: favoriteStations, isLoading: loadingFavorites } = useFavoriteStations();

  // Mutations
  const saveFavoriteMutation = useSaveFavoriteFromApi();
  const deleteFavoriteMutation = useDeleteFavoriteStation();

  // Handler for playing a station
  const handlePlayStation = (station: RadioBrowserStation | any) => {
    playRadio(station);
  };

  // Handler for toggling favorite
  const handleToggleFavorite = async (station: RadioBrowserStation) => {
    try {
      // Check if already in favorites
      const isInFavorites = favoriteStations?.some(
        (fav) => fav.stationUuid === station.stationuuid
      );

      if (isInFavorites) {
        // Remove from favorites
        const favoriteStation = favoriteStations?.find(
          (fav) => fav.stationUuid === station.stationuuid
        );
        if (favoriteStation) {
          await deleteFavoriteMutation.mutateAsync(favoriteStation.id!);
        }
      } else {
        // Add to favorites
        const dto = radioService.convertToSaveDto(station);
        await saveFavoriteMutation.mutateAsync(dto);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Handler for removing favorite
  const handleRemoveFavorite = async (stationId: string) => {
    try {
      await deleteFavoriteMutation.mutateAsync(stationId);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  // Check if a station is currently playing
  const isStationPlaying = (station: RadioBrowserStation | any) => {
    if (!isRadioMode || !currentRadioStation) return false;

    const stationUuid = 'stationuuid' in station ? station.stationuuid : station.stationUuid;
    const currentUuid = currentRadioStation.stationUuid;

    return isPlaying && stationUuid === currentUuid;
  };

  // Check if a station is in favorites
  const isStationFavorite = (station: RadioBrowserStation) => {
    return favoriteStations?.some((fav) => fav.stationUuid === station.stationuuid) || false;
  };

  // Get active stations list
  const getActiveStations = () => {
    switch (activeTab) {
      case 'top':
        return topVotedStations || [];
      case 'popular':
        return popularStations || [];
      case 'favorites':
        return favoriteStations || [];
      default:
        return [];
    }
  };

  const isLoading = loadingTopVoted || loadingPopular || loadingFavorites;
  const activeStations = getActiveStations();

  return (
    <div className={styles.radioPage}>
      <Sidebar />

      <main className={styles.radioPage__main}>
        <Header />

        <div className={styles.radioPage__content}>
          {/* Header */}
          <div className={styles.radioPage__header}>
            <h1 className={styles.radioPage__title}>Radio</h1>
            <p className={styles.radioPage__subtitle}>
              Discover and listen to thousands of radio stations worldwide
            </p>
          </div>

          {/* Tabs */}
          <div className={styles.radioPage__tabs}>
            <button
              className={`${styles.radioPage__tab} ${
                activeTab === 'top' ? styles['radioPage__tab--active'] : ''
              }`}
              onClick={() => setActiveTab('top')}
            >
              Top Voted
            </button>
            <button
              className={`${styles.radioPage__tab} ${
                activeTab === 'popular' ? styles['radioPage__tab--active'] : ''
              }`}
              onClick={() => setActiveTab('popular')}
            >
              Popular
            </button>
            <button
              className={`${styles.radioPage__tab} ${
                activeTab === 'favorites' ? styles['radioPage__tab--active'] : ''
              }`}
              onClick={() => setActiveTab('favorites')}
            >
              My Favorites ({favoriteStations?.length || 0})
            </button>
          </div>

          {/* Stations Grid */}
          {isLoading ? (
            <div className={styles.radioPage__loading}>Loading stations...</div>
          ) : activeStations.length === 0 ? (
            <div className={styles.radioPage__empty}>
              {activeTab === 'favorites'
                ? 'No favorite stations yet. Add some from Top Voted or Popular!'
                : 'No stations found'}
            </div>
          ) : (
            <div className={styles.radioPage__grid}>
              {activeStations.map((station: any) => (
                <RadioStationCard
                  key={'stationuuid' in station ? station.stationuuid : station.id}
                  station={station}
                  isFavorite={
                    'stationuuid' in station
                      ? isStationFavorite(station)
                      : true // Stations in favorites tab are always favorite
                  }
                  isPlaying={isStationPlaying(station)}
                  onPlay={() => handlePlayStation(station)}
                  onToggleFavorite={
                    activeTab === 'favorites'
                      ? () => handleRemoveFavorite(station.id!)
                      : 'stationuuid' in station
                      ? () => handleToggleFavorite(station)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
