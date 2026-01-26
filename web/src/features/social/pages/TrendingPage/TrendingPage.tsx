import { useState } from 'react';
import { TrendingUp, Play, Pause, Music } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { usePlayer } from '@features/player/context/PlayerContext';
import { getTopTracks, type TopTrack } from '@shared/services/play-tracking.service';
import styles from './TrendingPage.module.css';

type TimeRange = 'week' | 'month' | 'all';

/**
 * TrendingPage Component
 * Shows the top 50 most played tracks on the platform
 */
export default function TrendingPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const { play, pause, currentTrack, isPlaying } = usePlayer();

  const { data: topTracks, isLoading } = useQuery({
    queryKey: ['trending', timeRange],
    queryFn: () => getTopTracks(50, timeRange),
  });

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const isTrackPlaying = (trackId: string) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const handlePlayTrack = (track: TopTrack) => {
    if (!track.track) return;

    if (isTrackPlaying(track.trackId)) {
      pause();
      return;
    }

    play({
      id: track.trackId,
      title: track.track.title,
      artist: track.track.artistName || 'Unknown Artist',
      albumId: undefined,
      albumName: track.track.albumName || undefined,
      duration: track.track.duration || 0,
      coverImage: undefined,
    });
  };

  const timeRangeLabels: Record<TimeRange, string> = {
    week: 'Esta semana',
    month: 'Este mes',
    all: 'Siempre',
  };

  return (
    <div className={styles.trendingPage}>
      <Sidebar />

      <main className={styles.trendingPage__main}>
        <Header disableSearch />

        <div className={styles.trendingPage__content}>
          {/* Page Header */}
          <div className={styles.trendingPage__header}>
            <div className={styles.trendingPage__titleRow}>
              <h1 className={styles.trendingPage__title}>
                <TrendingUp size={28} />
                Tendencias
              </h1>
            </div>
            <p className={styles.trendingPage__subtitle}>
              Las 50 canciones más escuchadas en la plataforma
            </p>

            {/* Time Range Selector */}
            <div className={styles.trendingPage__periodSelector}>
              {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  className={`${styles.trendingPage__periodButton} ${
                    timeRange === range ? styles.trendingPage__periodButtonActive : ''
                  }`}
                  onClick={() => setTimeRange(range)}
                >
                  {timeRangeLabels[range]}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className={styles.trendingPage__loading}>
              <div className={styles.trendingPage__loadingSpinner} />
              <p>Cargando tendencias...</p>
            </div>
          ) : !topTracks || topTracks.length === 0 ? (
            <div className={styles.trendingPage__empty}>
              <TrendingUp size={48} />
              <p>No hay datos de tendencias disponibles</p>
              <span>Las tendencias se generan basándose en las reproducciones de los usuarios</span>
            </div>
          ) : (
            <div className={styles.trendingPage__list}>
              {topTracks.map((track, index) => {
                const trackPlaying = isTrackPlaying(track.trackId);
                return (
                  <div
                    key={track.trackId}
                    className={`${styles.trendingPage__track} ${
                      trackPlaying ? styles.trendingPage__trackPlaying : ''
                    }`}
                    onClick={() => handlePlayTrack(track)}
                  >
                    <span className={styles.trendingPage__rank}>
                      {index + 1}
                    </span>

                    <div className={styles.trendingPage__coverWrapper}>
                      {track.track?.albumName ? (
                        <div className={styles.trendingPage__cover}>
                          <Music size={20} />
                        </div>
                      ) : (
                        <div className={styles.trendingPage__cover}>
                          <Music size={20} />
                        </div>
                      )}
                    </div>

                    <div className={styles.trendingPage__trackInfo}>
                      <span className={styles.trendingPage__trackTitle}>
                        {track.track?.title || 'Unknown Track'}
                      </span>
                      <span className={styles.trendingPage__trackMeta}>
                        {track.track?.artistName || 'Unknown Artist'}
                        {track.track?.albumName && ` • ${track.track.albumName}`}
                      </span>
                    </div>

                    <div className={styles.trendingPage__stats}>
                      <span className={styles.trendingPage__playCount}>
                        {formatPlayCount(track.playCount)} reproducciones
                      </span>
                    </div>

                    <span className={styles.trendingPage__duration}>
                      {formatDuration(track.track?.duration)}
                    </span>

                    <button
                      className={`${styles.trendingPage__playButton} ${
                        trackPlaying ? styles.trendingPage__playButtonActive : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(track);
                      }}
                      aria-label={trackPlaying ? 'Pausar' : 'Reproducir'}
                    >
                      {trackPlaying ? (
                        <Pause size={16} fill="currentColor" />
                      ) : (
                        <Play size={16} fill="currentColor" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
