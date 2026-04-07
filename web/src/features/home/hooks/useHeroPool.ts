import { useEffect, useMemo, useState, useRef } from 'react';
import type { AutoPlaylist } from '@shared/services/recommendations.service';
import type { MusicVideo } from '@features/music-videos';
import { categorizeAutoPlaylists, randomSelect } from './index';
import type { Album, HeroItem } from '../types';

interface UseHeroPoolParams {
  recentAlbums?: Album[];
  topPlayedAlbums?: Album[];
  userTopPlayedAlbums?: Album[];
  recentlyPlayedAlbums?: { data: Album[] };
  autoPlaylists?: AutoPlaylist[];
  featuredAlbum?: Album;
  musicVideos?: MusicVideo[];
}

/** Genera y rota el pool del hero adaptado al nivel de actividad del usuario */
export function useHeroPool({
  recentAlbums,
  topPlayedAlbums,
  userTopPlayedAlbums,
  recentlyPlayedAlbums,
  autoPlaylists,
  featuredAlbum,
  musicVideos,
}: UseHeroPoolParams) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(() => Date.now());

  // Re-randomizar al montar
  useEffect(() => {
    setRefreshKey(Date.now());
    setCurrentIndex(0);
  }, []);

  const pool = useMemo((): HeroItem[] => {
    if (!recentAlbums || recentAlbums.length === 0) return [];

    const items: HeroItem[] = [];
    const userTop = userTopPlayedAlbums || [];
    const globalTop = topPlayedAlbums || [];
    const topPlayed = userTop.length > 0 ? userTop : globalTop;
    const userRecent = recentlyPlayedAlbums?.data || [];
    const recent = recentAlbums || [];

    // Lanzamientos recientes (últimos 3 meses)
    const newReleases = recent.filter((album) => {
      if (!album.releaseDate) return false;
      const diff = (Date.now() - new Date(album.releaseDate).getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 90;
    });

    // Music videos with a trackId (matched only)
    const matchedVideos = (musicVideos || []).filter((v) => !!v.trackId);

    const { artistPlaylists } = autoPlaylists
      ? categorizeAutoPlaylists(autoPlaylists)
      : { artistPlaylists: [] as AutoPlaylist[] };

    const hasHigh = userTop.length >= 5;
    const hasLow = userTop.length > 0 && userTop.length < 5;

    if (hasHigh) {
      // Usuario activo: top personal + recientes + playlists
      items.push(...topPlayed.slice(0, 2).map((a) => ({ type: 'album' as const, data: a })));

      const topIds = new Set(topPlayed.slice(0, 2).map((a) => a.id));
      const uniqueRecent = userRecent.filter((a) => !topIds.has(a.id));
      if (uniqueRecent.length > 0) {
        items.push(
          ...randomSelect(uniqueRecent, 1).map((a) => ({ type: 'album' as const, data: a }))
        );
      }
      if (newReleases.length > 0) {
        items.push(
          ...randomSelect(newReleases, 1).map((a) => ({ type: 'album' as const, data: a }))
        );
      }

      if (artistPlaylists.length >= 2) {
        items.push({ type: 'playlist' as const, data: artistPlaylists[0] });
        const less = artistPlaylists.slice(Math.floor(artistPlaylists.length / 2));
        const pick = randomSelect(less, 1);
        if (pick.length > 0) items.push({ type: 'playlist' as const, data: pick[0] });
      } else if (artistPlaylists.length === 1) {
        items.push({ type: 'playlist' as const, data: artistPlaylists[0] });
      }

      // Add 1 random music video for active users
      if (matchedVideos.length > 0) {
        const videoPick = randomSelect(matchedVideos, 1);
        items.push(
          ...videoPick.map((v) => ({
            type: 'music-video' as const,
            data: { ...v, artistId: '' },
          }))
        );
      }

      const existingIds = new Set(items.filter((i) => i.type === 'album').map((i) => i.data.id));
      const remaining = recent.filter((a) => !existingIds.has(a.id));
      items.push(...randomSelect(remaining, 2).map((a) => ({ type: 'album' as const, data: a })));
    } else if (hasLow) {
      // Poca actividad: top personal + más descubrimiento
      items.push(...topPlayed.slice(0, 1).map((a) => ({ type: 'album' as const, data: a })));

      const topIds = new Set(topPlayed.slice(0, 1).map((a) => a.id));
      const uniqueRecent = userRecent.filter((a) => !topIds.has(a.id));
      if (uniqueRecent.length > 0) {
        items.push(
          ...randomSelect(uniqueRecent, 1).map((a) => ({ type: 'album' as const, data: a }))
        );
      }
      items.push(...randomSelect(newReleases, 2).map((a) => ({ type: 'album' as const, data: a })));

      if (artistPlaylists.length > 0) {
        items.push({ type: 'playlist' as const, data: randomSelect(artistPlaylists, 1)[0] });
      }

      // Add 1 random music video for low-activity users
      if (matchedVideos.length > 0) {
        const videoPick = randomSelect(matchedVideos, 1);
        items.push(
          ...videoPick.map((v) => ({
            type: 'music-video' as const,
            data: { ...v, artistId: '' },
          }))
        );
      }

      const existingIds = new Set(items.filter((i) => i.type === 'album').map((i) => i.data.id));
      const remaining = recent.filter((a) => !existingIds.has(a.id));
      items.push(...randomSelect(remaining, 3).map((a) => ({ type: 'album' as const, data: a })));
    } else {
      // Usuario nuevo: lanzamientos recientes + álbumes añadidos
      items.push(...randomSelect(newReleases, 4).map((a) => ({ type: 'album' as const, data: a })));
      const existingIds = new Set(items.filter((i) => i.type === 'album').map((i) => i.data.id));
      const remaining = recent.filter((a) => !existingIds.has(a.id));
      items.push(...randomSelect(remaining, 4).map((a) => ({ type: 'album' as const, data: a })));
    }

    // Eliminar duplicados y limitar
    return Array.from(new Map(items.map((i) => [i.data.id, i])).values()).slice(0, 8);
  }, [
    recentAlbums,
    topPlayedAlbums,
    userTopPlayedAlbums,
    recentlyPlayedAlbums,
    autoPlaylists,
    musicVideos,
    refreshKey,
  ]);

  // Rotación automática cada 20s
  useEffect(() => {
    if (pool.length <= 1) return;
    const interval = setInterval(() => setCurrentIndex((p) => (p + 1) % pool.length), 20000);
    return () => clearInterval(interval);
  }, [pool.length]);

  const next = () => {
    if (pool.length <= 1) return;
    setCurrentIndex((p) => (p + 1) % pool.length);
  };
  const previous = () => {
    if (pool.length <= 1) return;
    setCurrentIndex((p) => (p === 0 ? pool.length - 1 : p - 1));
  };

  // Item actual con fallback al featuredAlbum de la API
  const currentItem: HeroItem | null =
    pool.length > 0
      ? pool[currentIndex]
      : featuredAlbum
        ? { type: 'album', data: featuredAlbum }
        : null;

  // Crossfade: transición suave entre items
  const prevRef = useRef<HeroItem | null>(null);
  const [exitingItem, setExitingItem] = useState<HeroItem | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev && currentItem && prev.data.id !== currentItem.data.id) {
      setExitingItem(prev);
    }
    prevRef.current = currentItem;
  }, [currentItem]);

  useEffect(() => {
    if (!exitingItem) return;
    const timer = setTimeout(() => setExitingItem(null), 900);
    return () => clearTimeout(timer);
  }, [exitingItem]);

  return { currentItem, exitingItem, next, previous };
}
