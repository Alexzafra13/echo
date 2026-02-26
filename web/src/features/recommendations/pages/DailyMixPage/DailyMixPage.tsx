import { useState, useEffect } from 'react';
import { Play, Sparkles, RefreshCw, Info } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { TrackList } from '@features/home/components/TrackList';
import { Button } from '@shared/components/ui';
import { usePlayer } from '@features/player/context/PlayerContext';
import { formatDuration } from '@shared/utils/format';
import {
  getDailyMix,
  type DailyMix,
  type ScoredTrack,
} from '@shared/services/recommendations.service';
import type { Track } from '@features/home/types';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './DailyMixPage.module.css';

/**
 * DailyMixPage Component
 * Displays a personalized Daily Mix of tracks based on user's listening habits
 */
export function DailyMixPage() {
  const { playQueue, currentTrack } = usePlayer();
  const [dailyMix, setDailyMix] = useState<DailyMix | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const loadDailyMix = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mix = await getDailyMix();
      logger.debug('[DailyMix] Received:', mix);
      logger.debug('[DailyMix] Tracks count:', mix.tracks?.length || 0);
      setDailyMix(mix);
    } catch (err) {
      logger.error('[DailyMix] Failed to load:', err);
      setError(getApiErrorMessage(err, 'Error al cargar el Daily Mix'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDailyMix();
  }, []);

  const handlePlayAll = () => {
    if (!dailyMix?.tracks || dailyMix.tracks.length === 0) return;

    const tracks = convertScoredTracksToPlayerTracks(dailyMix.tracks);
    playQueue(tracks, 0, 'recommendation');
  };

  const handlePlayTrack = (track: Track) => {
    if (!dailyMix?.tracks) return;

    const tracks = convertScoredTracksToPlayerTracks(dailyMix.tracks);
    const index = tracks.findIndex((t) => t.id === track.id);
    playQueue(tracks, index, 'recommendation');
  };

  const handleRefresh = () => {
    loadDailyMix();
  };

  // Convert ScoredTrack[] to Track[] for player
  const convertScoredTracksToPlayerTracks = (scoredTracks: ScoredTrack[]): Track[] => {
    return scoredTracks
      .filter((st) => st.track) // Only include tracks with data
      .map(
        (st) =>
          ({
            id: st.track!.id,
            title: st.track!.title,
            artistName: st.track!.artistName || 'Unknown Artist',
            albumName: st.track!.albumName,
            albumId: st.track!.albumId,
            artistId: st.track!.artistId,
            duration: st.track!.duration || 0,
            // Audio normalization data (LUFS)
            rgTrackGain: st.track!.rgTrackGain,
            rgTrackPeak: st.track!.rgTrackPeak,
          }) as Track
      );
  };

  const tracks = dailyMix ? convertScoredTracksToPlayerTracks(dailyMix.tracks) : [];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  return (
    <div className={styles.dailyMixPage}>
      <Sidebar />

      <main className={styles.dailyMixPage__main}>
        <Header />

        <div className={styles.dailyMixPage__content}>
          {/* Hero Section */}
          <div className={styles.dailyMixPage__hero}>
            <div className={styles.dailyMixPage__heroIcon}>
              <Sparkles size={64} />
            </div>
            <div className={styles.dailyMixPage__heroInfo}>
              <p className={styles.dailyMixPage__heroLabel}>Playlist personalizada</p>
              <h1 className={styles.dailyMixPage__heroTitle}>Daily Mix</h1>
              <p className={styles.dailyMixPage__heroDescription}>
                Una selección personalizada basada en tus gustos y hábitos de escucha
              </p>
              {dailyMix && (
                <div className={styles.dailyMixPage__heroMeta}>
                  <span>{dailyMix.metadata.totalTracks} canciones</span>
                  <span className={styles.dailyMixPage__separator}>•</span>
                  <span>{formatDuration(totalDuration)}</span>
                  <span className={styles.dailyMixPage__separator}>•</span>
                  <span className={styles.dailyMixPage__generatedDate}>
                    {formatDate(dailyMix.createdAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.dailyMixPage__actions}>
            <Button
              variant="primary"
              onClick={handlePlayAll}
              disabled={isLoading || !dailyMix || tracks.length === 0}
              className={styles.dailyMixPage__playButton}
            >
              <Play size={20} fill="currentColor" />
              Reproducir todo
            </Button>
            <Button variant="secondary" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw size={18} className={isLoading ? styles.spinning : ''} />
              {isLoading ? 'Generando...' : 'Regenerar'}
            </Button>
            <button
              className={styles.dailyMixPage__infoButton}
              onClick={() => setShowInfo(!showInfo)}
              title="Cómo funciona"
            >
              <Info size={20} />
            </button>
          </div>

          {/* Info Panel */}
          {showInfo && (
            <div className={styles.dailyMixPage__infoPanel}>
              <h3>¿Cómo funciona el Daily Mix?</h3>
              <p>Tu Daily Mix se genera utilizando un algoritmo inteligente que analiza:</p>
              <ul>
                <li>
                  <strong>Tus likes y ratings:</strong> Las canciones que has marcado como favoritas
                </li>
                <li>
                  <strong>Tu historial de reproducción:</strong> Qué canciones escuchas más y con
                  qué frecuencia
                </li>
                <li>
                  <strong>Patrones de escucha:</strong> Contexto de reproducción y tasa de
                  finalización
                </li>
                <li>
                  <strong>Diversidad:</strong> Evita saturación de un solo artista
                </li>
              </ul>
              {dailyMix && dailyMix.metadata && (
                <div className={styles.dailyMixPage__infoBreakdown}>
                  <p>
                    <strong>Estadísticas de tu mix:</strong>
                  </p>
                  <ul>
                    <li>Puntuación promedio: {dailyMix.metadata.avgScore.toFixed(1)} puntos</li>
                    <li>
                      Artistas destacados: {dailyMix.metadata.topArtists.slice(0, 3).join(', ')}
                    </li>
                    {dailyMix.metadata.topGenres.length > 0 && (
                      <li>Géneros: {dailyMix.metadata.topGenres.slice(0, 3).join(', ')}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className={styles.dailyMixPage__loading}>
              <div className={styles.dailyMixPage__loadingSpinner}>
                <Sparkles size={48} className={styles.spinning} />
              </div>
              <p>Generando tu Daily Mix personalizado...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className={styles.dailyMixPage__error}>
              <p>{error}</p>
              <Button variant="secondary" onClick={handleRefresh}>
                Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && dailyMix && tracks.length === 0 && (
            <div className={styles.dailyMixPage__emptyState}>
              <Sparkles size={64} />
              <h2>Aún no hay suficientes datos</h2>
              <p>
                Empieza a escuchar música, dar likes y ratings para que podamos generar tu Daily Mix
                personalizado
              </p>
            </div>
          )}

          {/* Track List */}
          {!isLoading && !error && dailyMix && tracks.length > 0 && (
            <div className={styles.dailyMixPage__tracks}>
              <TrackList
                tracks={tracks}
                onTrackPlay={handlePlayTrack}
                currentTrackId={currentTrack?.id}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
