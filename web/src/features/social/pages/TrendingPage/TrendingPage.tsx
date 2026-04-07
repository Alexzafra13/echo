import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Play, Pause, Disc3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Sidebar } from '@shared/components/layout/Sidebar';
import { Header } from '@shared/components/layout/Header';
import { usePlayback, useQueue } from '@features/player';
import { getTopTracks, type TopTrack } from '@shared/services/play-tracking.service';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { useDominantColor } from '@shared/hooks/useDominantColor';
import { getArtistImageUrl } from '@features/home/hooks';
import type { Track } from '@shared/types/track.types';
import styles from './TrendingPage.module.css';

type TimeRange = 'week' | 'month' | 'all';

export default function TrendingPage() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const periodNavRef = useRef<HTMLDivElement>(null);
  const periodRefs = useRef<Map<TimeRange, HTMLButtonElement>>(new Map());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const { currentTrack, isPlaying, togglePlayPause } = usePlayback();
  const { playQueue } = useQueue();
  const [, navigate] = useLocation();

  // Animated period indicator
  const updateIndicator = useCallback(() => {
    const activeButton = periodRefs.current.get(timeRange);
    const navContainer = periodNavRef.current;
    if (activeButton && navContainer) {
      const navRect = navContainer.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - navRect.left,
        width: buttonRect.width,
      });
    }
  }, [timeRange]);

  useEffect(() => updateIndicator(), [updateIndicator]);
  useEffect(() => {
    const timer = setTimeout(updateIndicator, 50);
    return () => clearTimeout(timer);
  }, []);

  // Top tracks
  const { data: topTracks = [], isLoading } = useQuery({
    queryKey: ['trending', timeRange],
    queryFn: () => getTopTracks(50, timeRange),
  });

  // Top 3 para podio
  const podium = topTracks.slice(0, 3);
  const restTracks = topTracks.slice(3, 50);

  // Colores dominantes de las 3 carátulas del podio
  const cover1 = podium[0]?.track?.albumId
    ? `/api/images/albums/${podium[0].track.albumId}/cover`
    : undefined;
  const cover2 = podium[1]?.track?.albumId
    ? `/api/images/albums/${podium[1].track.albumId}/cover`
    : undefined;
  const cover3 = podium[2]?.track?.albumId
    ? `/api/images/albums/${podium[2].track.albumId}/cover`
    : undefined;
  const color1 = useDominantColor(cover1);
  const color2 = useDominantColor(cover2);
  const color3 = useDominantColor(cover3);
  const dominantColor = color1;

  // Artistas mas escuchados (extraidos de los tracks)
  const topArtists = useMemo(() => {
    const artistMap = new Map<
      string,
      { name: string; artistId?: string; albumId?: string; plays: number }
    >();
    for (const entry of topTracks) {
      const name = entry.track?.artistName || t('social.unknown');
      const existing = artistMap.get(name);
      if (existing) {
        existing.plays += entry.playCount;
      } else {
        artistMap.set(name, {
          name,
          artistId: entry.track?.artistId,
          albumId: entry.track?.albumId,
          plays: entry.playCount,
        });
      }
    }
    return Array.from(artistMap.values())
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 8);
  }, [topTracks, t]);

  // Albums mas escuchados (extraidos de los tracks)
  const topAlbums = useMemo(() => {
    const albumMap = new Map<string, { id: string; name: string; artist: string; plays: number }>();
    for (const t of topTracks) {
      const albumId = t.track?.albumId;
      const albumName = t.track?.albumName;
      if (!albumId || !albumName) continue;
      const existing = albumMap.get(albumId);
      if (existing) {
        existing.plays += t.playCount;
      } else {
        albumMap.set(albumId, {
          id: albumId,
          name: albumName,
          artist: t.track?.artistName || '',
          plays: t.playCount,
        });
      }
    }
    return Array.from(albumMap.values())
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 4);
  }, [topTracks]);

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTrackPlaying = (trackId: string) => currentTrack?.id === trackId && isPlaying;

  const handlePlayTrack = async (track: TopTrack, allTracks?: TopTrack[]) => {
    if (!track.track) return;
    if (isTrackPlaying(track.trackId)) {
      togglePlayPause();
      return;
    }
    // Reproducir con cola
    const tracks = (allTracks || topTracks)
      .filter((item) => item.track)
      .map(
        (item) =>
          ({
            id: item.trackId,
            title: item.track!.title,
            artistName: item.track!.artistName,
            albumId: item.track!.albumId,
            albumName: item.track!.albumName,
            duration: item.track!.duration || 0,
          }) as Track
      );
    const idx = tracks.findIndex((item) => item.id === track.trackId);
    playQueue(tracks, Math.max(idx, 0));
  };

  // Genera un color consistente a partir del nombre
  const getInitialsColor = useCallback((name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 50%, 40%)`;
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, []);

  const timeRangeLabels: Record<TimeRange, string> = {
    week: t('social.timeWeek'),
    month: t('social.timeMonth'),
    all: t('social.timeAllTime'),
  };

  return (
    <div className={styles.page} style={{ '--trend-color': dominantColor } as React.CSSProperties}>
      <Sidebar />

      <main className={styles.main}>
        <Header alwaysGlass disableSearch />

        <div className={styles.content}>
          {/* Hero — top 3 con fondos de color */}
          <div className={styles.hero}>
            <div className={styles.heroBgSplit}>
              {podium.map((track, i) => {
                const artistId = track.track?.artistId;
                const bgUrl = artistId ? getArtistImageUrl(artistId, 'background') : undefined;
                const fallbackColor = [color1, color2, color3][i] || '25,25,50';
                return (
                  <div
                    key={i}
                    className={styles.heroBgSlice}
                    style={{ background: `rgb(${fallbackColor})` }}
                  >
                    {bgUrl && (
                      <img
                        src={bgUrl}
                        alt=""
                        className={styles.heroBgSliceImg}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                );
              })}
              {/* Rellenar slices vacíos si hay menos de 3 tracks */}
              {Array.from({ length: Math.max(0, 3 - podium.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={styles.heroBgSlice}
                  style={{ background: 'rgb(25,25,50)' }}
                />
              ))}
            </div>
            <div className={styles.heroFade} />
            <div className={styles.heroContent}>
              {podium.length > 0 && (
                <div className={styles.podium}>
                  {podium.map((track, i) => {
                    const coverUrl = track.track?.albumId
                      ? getCoverUrl(`/api/images/albums/${track.track.albumId}/cover`)
                      : undefined;
                    const playing = isTrackPlaying(track.trackId);
                    return (
                      <div
                        key={track.trackId}
                        className={`${styles.podiumItem} ${playing ? styles['podiumItem--playing'] : ''}`}
                        onClick={() => handlePlayTrack(track)}
                      >
                        <span className={`${styles.podiumRank} ${styles[`podiumRank--${i + 1}`]}`}>
                          {i + 1}
                        </span>
                        <div className={styles.podiumCoverWrap}>
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt=""
                              className={styles.podiumCover}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.podiumCoverPlaceholder}>
                              <Disc3 size={32} />
                            </div>
                          )}
                          <button className={styles.podiumPlayBtn}>
                            {playing ? (
                              <Pause size={22} fill="currentColor" />
                            ) : (
                              <Play size={22} fill="currentColor" />
                            )}
                          </button>
                        </div>
                        <h3 className={styles.podiumTitle}>{track.track?.title}</h3>
                        <span className={styles.podiumArtist}>{track.track?.artistName}</span>
                        <span className={styles.podiumPlays}>
                          {formatPlayCount(track.playCount)} {t('social.plays')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Titulo y selector de periodo */}
          <div className={styles.headerRow}>
            <h1 className={styles.pageTitle}>
              <TrendingUp size={22} /> {t('social.trending')}
            </h1>
            <div className={styles.periodSelector} ref={periodNavRef}>
              <div
                className={styles.periodIndicator}
                style={{
                  transform: `translateX(${indicatorStyle.left}px)`,
                  width: `${indicatorStyle.width}px`,
                }}
              />
              {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  ref={(el) => {
                    if (el) periodRefs.current.set(range, el);
                  }}
                  className={`${styles.periodBtn} ${timeRange === range ? styles['periodBtn--active'] : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {timeRangeLabels[range]}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>{t('social.loadingTrending')}</p>
            </div>
          ) : topTracks.length === 0 ? (
            <div className={styles.empty}>
              <TrendingUp size={48} />
              <p>{t('social.noTrendingData')}</p>
              <span>{t('social.noTrendingHint')}</span>
            </div>
          ) : (
            <>
              {/* Layout dos columnas */}
              <div className={styles.columns}>
                {/* Columna principal — lista de tracks */}
                <section className={styles.trackSection}>
                  <h2 className={styles.sectionTitle}>{t('social.fullRanking')}</h2>
                  <div className={styles.trackList}>
                    {restTracks.map((track, index) => {
                      const rank = index + 4;
                      const coverUrl = track.track?.albumId
                        ? getCoverUrl(`/api/images/albums/${track.track.albumId}/cover`)
                        : undefined;
                      const playing = isTrackPlaying(track.trackId);
                      return (
                        <div
                          key={track.trackId}
                          className={`${styles.trackRow} ${playing ? styles['trackRow--playing'] : ''}`}
                          onClick={() => handlePlayTrack(track)}
                        >
                          <div className={styles.trackRankWrap}>
                            <span
                              className={`${styles.trackRank} ${playing ? styles['trackRank--playing'] : ''}`}
                            >
                              {rank}
                            </span>
                            <button
                              className={`${styles.trackPlayBtn} ${playing ? styles['trackPlayBtn--active'] : ''}`}
                            >
                              {playing ? (
                                <Pause size={14} fill="currentColor" />
                              ) : (
                                <Play size={14} fill="currentColor" />
                              )}
                            </button>
                          </div>
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt=""
                              className={styles.trackCover}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.trackCoverPlaceholder}>
                              <Disc3 size={16} />
                            </div>
                          )}
                          <div className={styles.trackInfo}>
                            <span className={styles.trackTitle}>{track.track?.title}</span>
                            <span className={styles.trackArtist}>
                              {track.track?.artistName}
                              {track.track?.albumName ? ` · ${track.track.albumName}` : ''}
                            </span>
                          </div>
                          <span className={styles.trackPlays}>
                            {formatPlayCount(track.playCount)}
                          </span>
                          <span className={styles.trackDuration}>
                            {formatDuration(track.track?.duration)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Columna lateral */}
                <aside className={styles.sidebar}>
                  {/* Artistas en tendencia */}
                  {topArtists.length > 0 && (
                    <section className={styles.sideSection}>
                      <h2 className={styles.sectionTitle}>{t('social.featuredArtists')}</h2>
                      <div className={styles.artistList}>
                        {topArtists.map((artist) => (
                          <div
                            key={artist.name}
                            className={styles.artistRow}
                            onClick={() =>
                              artist.artistId && navigate(`/artists/${artist.artistId}`)
                            }
                          >
                            {artist.artistId && !failedImages.has(artist.artistId) ? (
                              <img
                                src={getArtistImageUrl(artist.artistId, 'profile')}
                                alt=""
                                className={styles.artistAvatar}
                                onError={() => {
                                  setFailedImages((prev) => new Set([...prev, artist.artistId!]));
                                }}
                              />
                            ) : (
                              <div
                                className={styles.artistAvatar}
                                style={{
                                  background: getInitialsColor(artist.name),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: 'white',
                                }}
                              >
                                {getInitials(artist.name)}
                              </div>
                            )}
                            <div className={styles.artistInfo}>
                              <span className={styles.artistName}>{artist.name}</span>
                              <span className={styles.artistPlays}>
                                {formatPlayCount(artist.plays)} {t('social.plays')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Albums mas escuchados */}
                  {topAlbums.length > 0 && (
                    <section className={styles.sideSection}>
                      <h2 className={styles.sectionTitle}>{t('social.topAlbums')}</h2>
                      <div className={styles.albumGrid}>
                        {topAlbums.map((album) => (
                          <div
                            key={album.id}
                            className={styles.albumCard}
                            onClick={() => navigate(`/album/${album.id}`)}
                          >
                            <img
                              src={getCoverUrl(`/api/images/albums/${album.id}/cover`)}
                              alt=""
                              className={styles.albumCover}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp';
                              }}
                            />
                            <span className={styles.albumTitle}>{album.name}</span>
                            <span className={styles.albumArtist}>{album.artist}</span>
                            <span className={styles.albumPlays}>
                              {formatPlayCount(album.plays)} {t('social.plays')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
