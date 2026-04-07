import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Shuffle, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { ActionCard } from '../ActionCard';
import { useShufflePlay } from '@shared/hooks';
import { useRandomAlbums } from '@features/explore/hooks';
import { useAutoPlaylists, getArtistImageUrl } from '@features/home/hooks';
import { getTopTracks } from '@shared/services/play-tracking.service';
import styles from './ActionCardsRow.module.css';

export interface ActionCardsRowProps {
  className?: string;
}

export function ActionCardsRow({ className }: ActionCardsRowProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { shufflePlay, isLoading: shuffleLoading } = useShufflePlay();

  const { data: randomAlbumsData } = useRandomAlbums(3);
  const { data: autoPlaylists } = useAutoPlaylists();

  const shuffleCoverUrl = useMemo(() => {
    const albums = randomAlbumsData?.albums || [];
    if (albums.length === 0) return undefined;
    const randomAlbum = albums[Math.floor(Math.random() * albums.length)];
    return randomAlbum?.id ? `/api/albums/${randomAlbum.id}/cover` : undefined;
  }, [randomAlbumsData]);

  const waveMixCoverUrl = useMemo(() => {
    if (!autoPlaylists || autoPlaylists.length === 0) return undefined;
    const albumIds = new Set<string>();
    for (const playlist of autoPlaylists) {
      for (const scoredTrack of playlist.tracks || []) {
        if (scoredTrack.track?.albumId) {
          albumIds.add(scoredTrack.track.albumId);
        }
      }
    }
    const albumIdArray = Array.from(albumIds);
    if (albumIdArray.length === 0) return undefined;
    const randomAlbumId = albumIdArray[Math.floor(Math.random() * albumIdArray.length)];
    return `/api/albums/${randomAlbumId}/cover`;
  }, [autoPlaylists]);

  // Imagen de artista trending random (solo artistas que tienen avatar)
  const { data: topTracks } = useQuery({
    queryKey: ['trending', 'month'],
    queryFn: () => getTopTracks(20, 'month'),
    staleTime: 5 * 60 * 1000,
  });

  const trendingArtistUrls = useMemo(() => {
    if (!topTracks || topTracks.length === 0) return [];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const t of topTracks) {
      const artistId = t.track?.artistId;
      if (artistId && !seen.has(artistId)) {
        seen.add(artistId);
        urls.push(getArtistImageUrl(artistId, 'profile'));
      }
    }
    // Shuffle para que rote en cada render
    for (let i = urls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [urls[i], urls[j]] = [urls[j], urls[i]];
    }
    return urls;
  }, [topTracks]);

  // Probar URLs hasta encontrar una que cargue (artista con avatar)
  const [trendingCoverUrl, setTrendingCoverUrl] = useState<string | undefined>();

  useEffect(() => {
    if (trendingArtistUrls.length === 0) return;
    let cancelled = false;

    (async () => {
      for (const url of trendingArtistUrls) {
        if (cancelled) return;
        const ok = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
        if (ok && !cancelled) {
          setTrendingCoverUrl(url);
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trendingArtistUrls]);

  const handleDaily = () => {
    setLocation('/daily');
  };

  const handleTrending = () => {
    setLocation('/trending');
  };

  return (
    <div className={`${styles.actionCardsRow} ${className || ''}`}>
      <ActionCard
        icon={<Shuffle size={22} />}
        loadingIcon={<RefreshCw size={22} className={styles.spinning} />}
        title={t('home.shuffle')}
        loadingTitle={t('common.loading')}
        onClick={shufflePlay}
        isLoading={shuffleLoading}
        customGradient={['#1a1a2e', '#16213e']}
        backgroundCoverUrl={shuffleCoverUrl}
      />

      <ActionCard
        icon={<Calendar size={22} />}
        title={t('home.waveMix')}
        onClick={handleDaily}
        customGradient={['#2d1f3d', '#1a1a2e']}
        backgroundCoverUrl={waveMixCoverUrl}
      />

      <ActionCard
        icon={<TrendingUp size={22} />}
        title={t('home.trending')}
        loadingTitle={t('common.loading')}
        onClick={handleTrending}
        customGradient={['#1f2d3d', '#1a2a1a']}
        backgroundCoverUrl={trendingCoverUrl}
      />
    </div>
  );
}

export default ActionCardsRow;
