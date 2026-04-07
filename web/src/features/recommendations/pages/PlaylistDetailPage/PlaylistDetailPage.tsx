import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoute, useLocation } from 'wouter';
import { Play, Shuffle } from 'lucide-react';
import { z } from 'zod';
import { Sidebar } from '@shared/components/layout/Sidebar';
import { Header } from '@shared/components/layout/Header';
import { TrackList } from '@shared/components/TrackList';
import { Button } from '@shared/components/ui';
import { useQueue, usePlayback } from '@features/player';
import { formatDuration } from '@shared/utils/format';
import { PlaylistCover } from '../../components/PlaylistCover';
import { useArtistImages, getArtistImageUrl } from '@features/home/hooks';
import { useArtist } from '@features/artists/hooks';
import { useDominantColors } from '@shared/hooks';
import type { AutoPlaylist } from '@shared/services/recommendations.service';
import { musicVideosService } from '@features/music-videos/services/music-videos.service';
import type { Track } from '@shared/types/track.types';
import { logger } from '@shared/utils/logger';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import styles from './PlaylistDetailPage.module.css';

// Schema Zod para validar datos de playlist desde sessionStorage.
// Usa passthrough() para permitir campos adicionales de la API no definidos explícitamente.
const AutoPlaylistSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['wave-mix', 'artist', 'genre', 'mood']),
    coverColor: z.string().optional().nullable(),
    coverImageUrl: z.string().optional().nullable(),
    metadata: z
      .object({
        totalTracks: z.number(),
        avgScore: z.number(),
        artistName: z.string().optional().nullable(),
        artistId: z.string().optional().nullable(),
        genreName: z.string().optional().nullable(),
        // Permitir campos adicionales de metadata (topGenres, topArtists, etc.)
      })
      .passthrough(),
    tracks: z.array(
      z
        .object({
          // Soportar ambos nombres de campo 'score' y 'totalScore' de la API
          score: z.number().optional(),
          totalScore: z.number().optional(),
          trackId: z.string().optional(),
          rank: z.number().optional(),
          track: z
            .object({
              id: z.string(),
              title: z.string(),
              artistName: z.string().optional().nullable(),
              albumName: z.string().optional().nullable(),
              albumId: z.string().optional().nullable(),
              artistId: z.string().optional().nullable(),
              duration: z.number().optional().nullable(),
            })
            .passthrough()
            .optional()
            .nullable(),
          // Permitir campos adicionales de track (breakdown, album, etc.)
        })
        .passthrough()
    ),
    // Permitir campos adicionales de playlist (userId, createdAt, expiresAt, etc.)
  })
  .passthrough();

/**
 * PlaylistDetailPage Component
 * Muestra una playlist individual con sus tracks
 */
export function PlaylistDetailPage() {
  const { t } = useTranslation();
  const [_match, _params] = useRoute('/wave-mix/:id');
  const [, setLocation] = useLocation();
  const { playQueue, setShuffle } = useQueue();
  const { currentTrack } = usePlayback();
  const [playlist, setPlaylist] = useState<AutoPlaylist | null>(null);
  const [videoMap, setVideoMap] = useState<Map<string, string>>(new Map());

  // Fetch video IDs for tracks in this playlist (trackId → videoId)
  useEffect(() => {
    if (!playlist?.tracks) return;
    const trackIds = playlist.tracks.filter((st) => st.track?.id).map((st) => st.track!.id);
    if (trackIds.length === 0) return;

    musicVideosService
      .getVideoMapByTrackIds(trackIds)
      .then(setVideoMap)
      .catch((err) => {
        if (import.meta.env.DEV) logger.error('Error fetching music video IDs:', err);
      });
  }, [playlist]);

  // Para playlists de artista, obtener imágenes para el fondo
  const artistId = playlist?.type === 'artist' ? playlist.metadata.artistId : undefined;
  const { data: artistImages } = useArtistImages(artistId);
  const { data: artist } = useArtist(artistId);

  useEffect(() => {
    // Obtener playlist de sessionStorage
    const storedPlaylist = safeSessionStorage.getItem('currentPlaylist');
    if (storedPlaylist) {
      try {
        const parsedData = JSON.parse(storedPlaylist);
        // passthrough() devuelve tipo más amplio que AutoPlaylist, doble cast necesario
        const validatedPlaylist = AutoPlaylistSchema.parse(parsedData) as unknown as AutoPlaylist;
        setPlaylist(validatedPlaylist);
      } catch (error) {
        logger.error('Failed to parse or validate playlist from sessionStorage', error);
        setLocation('/wave-mix');
      }
    } else {
      // Si no hay playlist en storage, redirigir a la página Wave Mix
      setLocation('/wave-mix');
    }
  }, [setLocation]);

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    // Desactivar modo aleatorio para reproducción ordenada
    setShuffle(false);
    const tracks = convertToPlayableTracks(playlist);
    playQueue(tracks, 0, 'recommendation');
  };

  const handleShufflePlay = () => {
    if (!playlist || playlist.tracks.length === 0) return;

    const playerTracks = convertToPlayableTracks(playlist);
    if (playerTracks.length === 0) return;

    // Activar modo aleatorio
    setShuffle(true);

    // Mezclar el array de tracks con el algoritmo Fisher-Yates
    const shuffledTracks = [...playerTracks];
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }

    playQueue(shuffledTracks, 0, 'recommendation');
  };

  const handlePlayTrack = (track: Track) => {
    if (!playlist) return;
    const playable = convertToPlayableTracks(playlist);
    const index = playable.findIndex((t) => t.id === track.id);
    playQueue(playable, index, 'recommendation');
  };

  // Convertir a tracks para reproducción (con coverImage)
  const convertToPlayableTracks = (playlist: AutoPlaylist): Track[] => {
    return playlist.tracks
      .filter((st) => st.track)
      .map((st) => ({
        id: st.track!.id,
        title: st.track!.title,
        artist: st.track!.artistName || 'Unknown Artist',
        albumId: st.track!.albumId,
        albumName: st.track!.albumName,
        duration: st.track!.duration || 0,
        coverImage: st.track!.albumId ? `/api/albums/${st.track!.albumId}/cover` : undefined,
        // Datos de normalización de audio (LUFS)
        rgTrackGain: st.track!.rgTrackGain,
        rgTrackPeak: st.track!.rgTrackPeak,
        videoId: videoMap.get(st.track!.id),
      }));
  };

  // Convertir a tracks para mostrar en TrackList (con metadata completa)
  const convertToDisplayTracks = (playlist: AutoPlaylist): Track[] => {
    return playlist.tracks
      .filter((st) => st.track)
      .map((st) => ({
        id: st.track!.id,
        title: st.track!.title,
        artistName: st.track!.artistName || 'Unknown Artist',
        albumName: st.track!.albumName,
        albumId: st.track!.albumId,
        artistId: st.track!.artistId,
        duration: st.track!.duration || 0,
        suffix: (st.track as Record<string, unknown>)?.suffix as string | undefined,
        bitRate: (st.track as Record<string, unknown>)?.bitRate as number | undefined,
        path: '',
        discNumber: 1,
        compilation: false,
        videoId: videoMap.get(st.track!.id),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
  };

  // Obtener imagen de fondo para playlists de artista
  // Prioridad: background > banner > avatar (coverImageUrl)
  const getBackgroundUrl = (): string | null => {
    if (playlist?.type !== 'artist' || !artistId) return null;

    const hasBackground = artistImages?.images.background?.exists;
    const hasBanner = artistImages?.images.banner?.exists;

    // Prioridad: siempre preferir background sobre banner
    if (hasBackground) {
      const tag = artistImages?.images.background?.tag;
      return getArtistImageUrl(artistId, 'background', tag);
    }

    if (hasBanner) {
      const tag = artistImages?.images.banner?.tag;
      return getArtistImageUrl(artistId, 'banner', tag);
    }

    // Fallback a avatar/coverImageUrl
    return playlist.coverImageUrl || null;
  };

  // Para playlists de género/wave-mix: recopilar portadas únicas para mosaico de fondo
  const genreBackgroundUrls = useMemo(() => {
    if (!playlist || playlist.type === 'artist') return [];
    const albumIds = new Set<string>();
    for (const st of playlist.tracks) {
      if (st.track?.albumId) albumIds.add(st.track.albumId);
    }
    const ids = Array.from(albumIds);
    if (ids.length === 0) return [];
    // Tomar hasta 4 portadas para el grid de mosaico
    return ids.slice(0, 4).map((id) => `/api/albums/${id}/cover`);
  }, [playlist]);

  // Extraer colores dominantes de portadas de álbum para el degradado
  const genreAlbumCoverUrls = useMemo(() => {
    if (!playlist || playlist.type === 'artist') return [];
    const albumIds = new Set<string>();
    for (const st of playlist.tracks) {
      if (st.track?.albumId) albumIds.add(st.track.albumId);
    }
    return Array.from(albumIds)
      .slice(0, 4)
      .map((id) => `/api/albums/${id}/cover`);
  }, [playlist]);
  const genreDominantColors = useDominantColors(genreAlbumCoverUrls);

  // Construir degradado multicolor para playlists de género/wave-mix
  const genreGradientStyle = useMemo(() => {
    if (!playlist || playlist.type === 'artist') return undefined;
    const c = genreDominantColors;
    if (c.length === 0) return undefined;
    const blobs = [
      `radial-gradient(ellipse at 20% 0%, rgba(${c[0]}, 0.5) 0%, transparent 55%)`,
      c[1] ? `radial-gradient(ellipse at 80% 0%, rgba(${c[1]}, 0.4) 0%, transparent 55%)` : '',
      c[2] ? `radial-gradient(ellipse at 0% 40%, rgba(${c[2]}, 0.3) 0%, transparent 50%)` : '',
      c[3] ? `radial-gradient(ellipse at 100% 30%, rgba(${c[3]}, 0.25) 0%, transparent 50%)` : '',
    ].filter(Boolean);
    return { '--playlist-bg': blobs.join(', ') } as React.CSSProperties;
  }, [playlist, genreDominantColors]);

  if (!playlist) {
    return null;
  }

  const tracks = convertToDisplayTracks(playlist);
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const isArtistPlaylist = playlist.type === 'artist';
  const hasHeroBackground = isArtistPlaylist || genreBackgroundUrls.length > 0;
  const backgroundUrl = isArtistPlaylist ? getBackgroundUrl() : null;

  // Obtener posición del fondo de los datos del artista si está disponible
  const backgroundPosition = artist?.backgroundPosition || 'center top';

  return (
    <div
      className={`${styles.playlistDetailPage} ${hasHeroBackground ? styles['playlistDetailPage--heroMobile'] : ''}`}
    >
      <Sidebar />

      <main className={styles.playlistDetailPage__main}>
        <Header showBackButton disableSearch />

        <div
          className={styles.playlistDetailPage__content}
          style={isArtistPlaylist ? undefined : genreGradientStyle}
        >
          {/* Hero Section */}
          <div
            className={`${styles.playlistDetailPage__hero} ${hasHeroBackground ? styles['playlistDetailPage__hero--withBg'] : ''} ${isArtistPlaylist ? styles['playlistDetailPage__hero--artist'] : ''}`}
          >
            {/* Background: artist uses single image, genre/wave-mix uses mosaic */}
            {isArtistPlaylist && backgroundUrl && (
              <div
                className={styles.playlistDetailPage__background}
                style={{
                  backgroundImage: `url(${backgroundUrl})`,
                  backgroundPosition: backgroundPosition,
                }}
              />
            )}
            {!isArtistPlaylist && genreBackgroundUrls.length > 0 && (
              <div
                className={`${styles.playlistDetailPage__background} ${styles['playlistDetailPage__background--genre']}`}
              >
                <div
                  className={`${styles.backgroundMosaic} ${styles[`backgroundMosaic--${Math.min(genreBackgroundUrls.length, 4)}`]}`}
                >
                  {genreBackgroundUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className={styles.backgroundMosaic__img}
                      draggable={false}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className={styles.playlistDetailPage__heroContent}>
              {/* Hide PlaylistCover on mobile for artist playlists - show only background */}
              <PlaylistCover
                type={playlist.type}
                name={playlist.name}
                coverColor={playlist.coverColor}
                coverImageUrl={playlist.coverImageUrl}
                artistName={playlist.metadata.artistName}
                size="large"
                className={`${styles.playlistCover} ${isArtistPlaylist ? styles['playlistCover--artist'] : ''}`}
              />
              <div className={styles.playlistDetailPage__info}>
                <p className={styles.playlistType}>
                  {playlist.type === 'wave-mix' && t('recommendations.typePersonalized')}
                  {playlist.type === 'artist' && t('recommendations.typeArtist')}
                  {playlist.type === 'genre' && t('recommendations.typeGenre')}
                  {playlist.type === 'mood' && t('recommendations.typeMood')}
                </p>
                <h1 className={styles.playlistName}>
                  {playlist.type === 'artist'
                    ? t('recommendations.bestOf', {
                        name: playlist.metadata.artistName || playlist.name,
                      })
                    : playlist.name}
                </h1>
                <div className={styles.playlistMeta}>
                  <span>{t('playlists.songs', { count: playlist.metadata.totalTracks })}</span>
                  <span className={styles.separator}>•</span>
                  <span>{formatDuration(totalDuration)}</span>
                  {playlist.metadata.avgScore > 0 && (
                    <>
                      <span className={styles.separator}>•</span>
                      <span>
                        {t('recommendations.scoreLabel', {
                          score: playlist.metadata.avgScore.toFixed(1),
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.playlistDetailPage__actions}>
            <Button variant="primary" onClick={handlePlayAll} disabled={tracks.length === 0}>
              <Play size={20} fill="currentColor" />
              {t('recommendations.playBtn')}
            </Button>
            <Button variant="secondary" onClick={handleShufflePlay} disabled={tracks.length === 0}>
              <Shuffle size={20} />
              {t('recommendations.shuffleBtn')}
            </Button>
          </div>

          {/* Track List */}
          {tracks.length > 0 && (
            <div className={styles.playlistDetailPage__tracks}>
              <TrackList
                tracks={tracks}
                onTrackPlay={handlePlayTrack}
                currentTrackId={currentTrack?.id}
              />
            </div>
          )}

          {tracks.length === 0 && (
            <div className={styles.emptyState}>
              <p>{t('recommendations.noSongs')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
