import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Play, ArrowLeft } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { TrackList } from '@features/home/components/TrackList';
import { Button } from '@shared/components/ui';
import { usePlayer } from '@features/player/context/PlayerContext';
import { PlaylistCover } from '../../components/PlaylistCover';
import type { AutoPlaylist } from '@shared/services/recommendations.service';
import type { Track } from '@features/home/types';
import styles from './PlaylistDetailPage.module.css';

/**
 * PlaylistDetailPage Component
 * Displays individual playlist with tracks
 */
export function PlaylistDetailPage() {
  const [match, params] = useRoute('/wave-mix/:id');
  const [, setLocation] = useLocation();
  const { playQueue, currentTrack } = usePlayer();
  const [playlist, setPlaylist] = useState<AutoPlaylist | null>(null);

  useEffect(() => {
    // Get playlist from sessionStorage
    const storedPlaylist = sessionStorage.getItem('currentPlaylist');
    if (storedPlaylist) {
      try {
        const parsedPlaylist = JSON.parse(storedPlaylist) as AutoPlaylist;
        setPlaylist(parsedPlaylist);
      } catch (error) {
        console.error('Failed to parse playlist from sessionStorage', error);
        setLocation('/wave-mix');
      }
    } else {
      // If no playlist in storage, redirect back to Wave Mix page
      setLocation('/wave-mix');
    }
  }, [setLocation]);

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    const tracks = convertToPlayerTracks(playlist);
    playQueue(tracks);
  };

  const handlePlayTrack = (track: Track) => {
    if (!playlist) return;
    const tracks = convertToPlayerTracks(playlist);
    const index = tracks.findIndex((t) => t.id === track.id);
    playQueue(tracks, index);
  };

  const handleBack = () => {
    sessionStorage.removeItem('currentPlaylist');
    setLocation('/wave-mix');
  };

  const convertToPlayerTracks = (playlist: AutoPlaylist): Track[] => {
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
        path: st.track!.path || '',
        discNumber: st.track!.discNumber || 1,
        compilation: st.track!.compilation || false,
        createdAt: new Date(st.track!.createdAt || Date.now()),
        updatedAt: new Date(st.track!.updatedAt || Date.now()),
      } as Track));
  };

  if (!playlist) {
    return null;
  }

  const tracks = convertToPlayerTracks(playlist);
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  return (
    <div className={styles.playlistDetailPage}>
      <Sidebar />

      <main className={styles.playlistDetailPage__main}>
        <Header />

        <div className={styles.playlistDetailPage__content}>
          {/* Hero Section */}
          <div className={styles.playlistDetailPage__hero}>
            <Button
              variant="ghost"
              onClick={handleBack}
              className={styles.backButton}
            >
              <ArrowLeft size={20} />
              Volver
            </Button>

            <div className={styles.playlistDetailPage__heroContent}>
              <PlaylistCover
                type={playlist.type}
                name={playlist.name}
                coverColor={playlist.coverColor}
                coverImageUrl={playlist.coverImageUrl}
                artistName={playlist.metadata.artistName}
                size="large"
                className={styles.playlistCover}
              />
              <div className={styles.playlistDetailPage__info}>
                <p className={styles.playlistType}>
                  {playlist.type === 'wave-mix' ? 'Playlist Personalizada' : 'Playlist de Artista'}
                </p>
                <h1 className={styles.playlistName}>{playlist.name}</h1>
                <p className={styles.playlistDescription}>{playlist.description}</p>
                <div className={styles.playlistMeta}>
                  <span>{playlist.metadata.totalTracks} canciones</span>
                  <span className={styles.separator}>•</span>
                  <span>{formatDuration(totalDuration)}</span>
                  {playlist.metadata.avgScore > 0 && (
                    <>
                      <span className={styles.separator}>•</span>
                      <span>Puntuación: {playlist.metadata.avgScore.toFixed(1)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.playlistDetailPage__actions}>
            <Button
              variant="primary"
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className={styles.playButton}
            >
              <Play size={20} fill="currentColor" />
              Reproducir todo
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
              <p>No hay canciones en esta playlist</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
