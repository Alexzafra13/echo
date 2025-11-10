import { useState } from 'react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import {
  RadioStationCard,
  RadioSearch,
  FilterTabs,
  CountryGrid,
  GenreCard,
  type FilterTab,
  type Country,
  type Genre,
} from '../../components';
import { usePlayer } from '@features/player/context/PlayerContext';
import {
  useTopVotedStations,
  usePopularStations,
  useStationsByCountry,
  useStationsByTag,
  useFavoriteStations,
  useSaveFavoriteFromApi,
  useDeleteFavoriteStation,
  useUserCountry,
  useSearchStations,
} from '../../hooks';
import { radioService } from '../../services';
import type { RadioBrowserStation } from '../../types';
import styles from './RadioPage.module.css';

const POPULAR_COUNTRIES: Country[] = [
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'GB', name: 'UK', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
];

const GENRES: Genre[] = [
  { id: 'rock', name: 'Rock', icon: '🎸', stationCount: 245 },
  { id: 'pop', name: 'Pop', icon: '🎵', stationCount: 312 },
  { id: 'jazz', name: 'Jazz', icon: '🎷', stationCount: 89 },
  { id: 'news', name: 'News', icon: '📻', stationCount: 156 },
  { id: 'dance', name: 'Dance', icon: '💃', stationCount: 198 },
  { id: 'classical', name: 'Clásica', icon: '🎻', stationCount: 67 },
];

export default function RadioPage() {
  const { playRadio, currentRadioStation, isPlaying, isRadioMode } = usePlayer();

  // Detectar país del usuario
  const { data: userCountry } = useUserCountry();

  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [localCountryFilter, setLocalCountryFilter] = useState('top');
  const [internationalCountry, setInternationalCountry] = useState<string | null>(null);
  const [popularFilter, setPopularFilter] = useState('global');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Tabs para país local
  const localTabs: FilterTab[] = [
    { id: 'top', label: 'Top 20' },
    { id: 'rock', label: 'Rock' },
    { id: 'pop', label: 'Pop' },
    { id: 'news', label: 'News' },
    { id: 'jazz', label: 'Jazz' },
    { id: 'dance', label: 'Dance' },
  ];

  // Tabs para populares
  const popularTabs: FilterTab[] = [
    { id: 'global', label: 'Global' },
    { id: 'rock', label: 'Rock' },
    { id: 'pop', label: 'Pop' },
    { id: 'jazz', label: 'Jazz' },
    { id: 'electronic', label: 'Electronic' },
  ];

  // Queries
  const { data: topVotedStations } = useTopVotedStations(20);
  const { data: popularStations } = usePopularStations(20);
  const { data: favoriteStations } = useFavoriteStations();

  // Query para país local con filtro
  const localCountryCode = userCountry?.countryCode || 'ES';
  const localTag = localCountryFilter === 'top' ? undefined : localCountryFilter;
  const { data: localStations } = useStationsByCountry(localCountryCode, 20);
  const { data: localTagStations } = useStationsByTag(localTag || '', 20);

  // Query para país internacional seleccionado
  const { data: internationalStations } = useStationsByCountry(
    internationalCountry || '',
    20
  );

  // Query para género seleccionado
  const { data: genreStations } = useStationsByTag(selectedGenre || '', 20);

  // Query para búsqueda
  const { data: searchResults } = useSearchStations(
    { name: searchQuery, limit: 20 },
    searchQuery.length > 0
  );

  // Mutations
  const saveFavoriteMutation = useSaveFavoriteFromApi();
  const deleteFavoriteMutation = useDeleteFavoriteStation();

  // Handlers
  const handlePlayStation = (station: RadioBrowserStation | any) => {
    playRadio(station);
  };

  const handleToggleFavorite = async (station: RadioBrowserStation) => {
    try {
      const isInFavorites = favoriteStations?.some(
        (fav) => fav.stationUuid === station.stationuuid
      );

      if (isInFavorites) {
        const favoriteStation = favoriteStations?.find(
          (fav) => fav.stationUuid === station.stationuuid
        );
        if (favoriteStation) {
          await deleteFavoriteMutation.mutateAsync(favoriteStation.id!);
        }
      } else {
        const dto = radioService.convertToSaveDto(station);
        await saveFavoriteMutation.mutateAsync(dto);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleRemoveFavorite = async (stationId: string) => {
    try {
      await deleteFavoriteMutation.mutateAsync(stationId);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const isStationPlaying = (station: RadioBrowserStation | any) => {
    if (!isRadioMode || !currentRadioStation) return false;
    const stationUuid = 'stationuuid' in station ? station.stationuuid : station.stationUuid;
    const currentUuid = currentRadioStation.stationUuid;
    return isPlaying && stationUuid === currentUuid;
  };

  const isStationFavorite = (station: RadioBrowserStation) => {
    return favoriteStations?.some((fav) => fav.stationUuid === station.stationuuid) || false;
  };

  // Determinar qué emisoras mostrar según filtros
  const getLocalStations = () => {
    if (localCountryFilter === 'top') {
      return localStations || [];
    }
    return localTagStations || [];
  };

  const getPopularStationsFiltered = () => {
    if (popularFilter === 'global') {
      return popularStations || [];
    }
    // TODO: Filtrar por género
    return popularStations || [];
  };

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
              Descubre y escucha miles de emisoras de todo el mundo
            </p>
          </div>

          {/* Búsqueda global */}
          <RadioSearch
            onSearch={setSearchQuery}
            placeholder="Buscar emisora por nombre..."
          />

          {/* Resultados de búsqueda */}
          {searchQuery && searchResults && (
            <section className={styles.radioPage__section}>
              <h2 className={styles.sectionTitle}>
                Resultados para "{searchQuery}" ({searchResults.length})
              </h2>
              {searchResults.length > 0 ? (
                <div className={styles.radioPage__grid}>
                  {searchResults.map((station: RadioBrowserStation) => (
                    <RadioStationCard
                      key={station.stationuuid}
                      station={station}
                      isFavorite={isStationFavorite(station)}
                      isPlaying={isStationPlaying(station)}
                      onPlay={() => handlePlayStation(station)}
                      onToggleFavorite={() => handleToggleFavorite(station)}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.radioPage__empty}>
                  No se encontraron emisoras con ese nombre
                </p>
              )}
            </section>
          )}

          {/* Secciones principales (ocultar si hay búsqueda) */}
          {!searchQuery && (
            <>
              {/* Tu País */}
              <section className={styles.radioPage__section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    📍 {userCountry?.countryName || 'Tu País'}
                  </h2>
                  <span className={styles.sectionSubtitle}>Auto-detectado</span>
                </div>

                <FilterTabs
                  tabs={localTabs}
                  activeTab={localCountryFilter}
                  onTabChange={setLocalCountryFilter}
                />

                <div className={styles.radioPage__grid}>
                  {getLocalStations().slice(0, 10).map((station: RadioBrowserStation) => (
                    <RadioStationCard
                      key={station.stationuuid}
                      station={station}
                      isFavorite={isStationFavorite(station)}
                      isPlaying={isStationPlaying(station)}
                      onPlay={() => handlePlayStation(station)}
                      onToggleFavorite={() => handleToggleFavorite(station)}
                    />
                  ))}
                </div>
              </section>

              {/* Internacional */}
              <section className={styles.radioPage__section}>
                <h2 className={styles.sectionTitle}>🌍 Internacional</h2>
                <p className={styles.sectionDescription}>
                  Selecciona un país para explorar sus emisoras
                </p>

                <CountryGrid
                  countries={POPULAR_COUNTRIES}
                  onCountrySelect={setInternationalCountry}
                />

                {internationalCountry && internationalStations && (
                  <>
                    <h3 className={styles.subsectionTitle}>
                      Emisoras de {POPULAR_COUNTRIES.find(c => c.code === internationalCountry)?.name}
                    </h3>
                    <div className={styles.radioPage__grid}>
                      {internationalStations.slice(0, 10).map((station: RadioBrowserStation) => (
                        <RadioStationCard
                          key={station.stationuuid}
                          station={station}
                          isFavorite={isStationFavorite(station)}
                          isPlaying={isStationPlaying(station)}
                          onPlay={() => handlePlayStation(station)}
                          onToggleFavorite={() => handleToggleFavorite(station)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Más Populares */}
              <section className={styles.radioPage__section}>
                <h2 className={styles.sectionTitle}>⭐ Más Populares</h2>

                <FilterTabs
                  tabs={popularTabs}
                  activeTab={popularFilter}
                  onTabChange={setPopularFilter}
                />

                <div className={styles.radioPage__grid}>
                  {getPopularStationsFiltered().slice(0, 8).map((station: RadioBrowserStation) => (
                    <RadioStationCard
                      key={station.stationuuid}
                      station={station}
                      isFavorite={isStationFavorite(station)}
                      isPlaying={isStationPlaying(station)}
                      onPlay={() => handlePlayStation(station)}
                      onToggleFavorite={() => handleToggleFavorite(station)}
                    />
                  ))}
                </div>
              </section>

              {/* Por Género */}
              <section className={styles.radioPage__section}>
                <h2 className={styles.sectionTitle}>🎵 Por Género</h2>
                <p className={styles.sectionDescription}>
                  Explora emisoras por tipo de música
                </p>

                <div className={styles.genreGrid}>
                  {GENRES.map((genre) => (
                    <GenreCard
                      key={genre.id}
                      genre={genre}
                      onClick={setSelectedGenre}
                    />
                  ))}
                </div>

                {selectedGenre && genreStations && (
                  <>
                    <h3 className={styles.subsectionTitle}>
                      Emisoras de {GENRES.find(g => g.id === selectedGenre)?.name}
                    </h3>
                    <div className={styles.radioPage__grid}>
                      {genreStations.slice(0, 10).map((station: RadioBrowserStation) => (
                        <RadioStationCard
                          key={station.stationuuid}
                          station={station}
                          isFavorite={isStationFavorite(station)}
                          isPlaying={isStationPlaying(station)}
                          onPlay={() => handlePlayStation(station)}
                          onToggleFavorite={() => handleToggleFavorite(station)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Mis Favoritos */}
              {favoriteStations && favoriteStations.length > 0 && (
                <section className={styles.radioPage__section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      ❤️ Mis Favoritos ({favoriteStations.length})
                    </h2>
                  </div>

                  <div className={styles.radioPage__grid}>
                    {favoriteStations.map((station: any) => (
                      <RadioStationCard
                        key={station.id}
                        station={station}
                        isFavorite={true}
                        isPlaying={isStationPlaying(station)}
                        onPlay={() => handlePlayStation(station)}
                        onToggleFavorite={() => handleRemoveFavorite(station.id!)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
