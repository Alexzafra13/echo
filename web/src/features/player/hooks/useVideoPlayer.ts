/**
 * Hook para gestionar la reproduccion de video inline y fullscreen
 * dentro del reproductor. Coordina pausa/reanudacion del audio,
 * sincronizacion de volumen y progreso del video.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { musicVideosService } from '@features/music-videos/services/music-videos.service';
import type { Track } from '../types';

interface UseVideoPlayerParams {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  pause: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  ensureToken: () => Promise<string | null>;
}

export function useVideoPlayer({
  currentTrack,
  isPlaying,
  volume,
  pause,
  togglePlayPause,
  setVolume,
  ensureToken,
}: UseVideoPlayerParams) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wasAudioPlayingRef = useRef(false);

  const handleOpenVideo = useCallback(async () => {
    if (!currentTrack?.videoId) return;
    const token = await ensureToken();
    if (!token) return;
    wasAudioPlayingRef.current = isPlaying;
    if (isPlaying) pause();
    setVideoStreamUrl(musicVideosService.getStreamUrl(currentTrack.videoId, token));
    setIsVideoOpen(true);
    setIsVideoPlaying(true);
  }, [currentTrack?.videoId, ensureToken, pause, isPlaying]);

  const handleCloseVideo = useCallback(() => {
    if (videoRef.current) videoRef.current.pause();
    setIsVideoOpen(false);
    setIsVideoFullscreen(false);
    setIsVideoPlaying(false);
    setVideoStreamUrl(null);
    if (wasAudioPlayingRef.current) {
      togglePlayPause();
    }
  }, [togglePlayPause]);

  // Retorna true si el video manejó el play/pause, false si no hay video activo
  const handleVideoPlayPause = useCallback(() => {
    if (!isVideoOpen || !videoRef.current) return false;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
    return true;
  }, [isVideoOpen]);

  const handleVideoSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const handleVolumeChangeWithVideo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (isVideoOpen && videoRef.current) {
        videoRef.current.volume = newVolume;
      }
    },
    [setVolume, isVideoOpen]
  );

  // Cerrar video cuando cambia el track
  useEffect(() => {
    if (isVideoOpen) {
      if (videoRef.current) videoRef.current.pause();
      setIsVideoOpen(false);
      setIsVideoFullscreen(false);
      setIsVideoPlaying(false);
      setVideoStreamUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Solo reaccionar a cambio de track
  }, [currentTrack?.id]);

  // Sincronizar volumen del video con el del player
  useEffect(() => {
    if (isVideoOpen && videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume, isVideoOpen]);

  return {
    isVideoOpen,
    isVideoFullscreen,
    setIsVideoFullscreen,
    isVideoPlaying,
    setIsVideoPlaying,
    videoStreamUrl,
    videoRef,
    videoCurrentTime,
    setVideoCurrentTime,
    videoDuration,
    setVideoDuration,
    handleOpenVideo,
    handleCloseVideo,
    handleVideoPlayPause,
    handleVideoSeek,
    handleVolumeChangeWithVideo,
  };
}
