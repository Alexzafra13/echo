import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Track, PlayerState, PlayerContextValue } from '../types';
import { useStreamToken } from '../hooks/useStreamToken';

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: streamTokenData } = useStreamToken();
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    isShuffle: false,
    repeatMode: 'off',
  });

  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);

  // Play next track in queue
  const playNext = () => {
    if (state.queue.length === 0) return;

    let nextIndex: number;
    if (state.isShuffle) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } else {
      nextIndex = currentQueueIndex + 1;
      if (nextIndex >= state.queue.length) {
        if (state.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
      }
    }

    setCurrentQueueIndex(nextIndex);
    play(state.queue[nextIndex]);
  };

  // Handle track ended - needs to be updated when dependencies change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (state.repeatMode === 'one') {
        audio.play();
      } else if (state.repeatMode === 'all' || currentQueueIndex < state.queue.length - 1) {
        playNext();
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [state.repeatMode, currentQueueIndex, state.queue.length]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audioRef.current = audio;

    // Event listeners
    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
    };
  }, []);

  // Play a track
  const play = (track?: Track) => {
    if (!audioRef.current) return;

    if (track) {
      // Play new track
      if (!streamTokenData?.token) {
        console.error('[Player] Stream token not available');
        return;
      }

      // Use VITE_API_URL with fallback to /api (same as apiClient)
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      const streamUrl = `${API_BASE_URL}/tracks/${track.id}/stream?token=${streamTokenData.token}`;

      audioRef.current.src = streamUrl;
      audioRef.current.load();

      // Error handler for audio loading issues
      audioRef.current.onerror = () => {
        console.error('[Player] Failed to load audio track:', track.title);
      };

      audioRef.current.play().catch((error) => {
        console.error('[Player] Failed to play audio:', error.message);
      });

      setState(prev => ({
        ...prev,
        currentTrack: track,
        isPlaying: true,
      }));
    } else if (state.currentTrack) {
      // Resume current track
      audioRef.current.play();
    }
  };

  // Pause
  const pause = () => {
    audioRef.current?.pause();
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Stop
  const stop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  };

  // Play previous track in queue
  const playPrevious = () => {
    if (state.queue.length === 0) return;

    // If more than 3 seconds played, restart current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
      if (state.repeatMode === 'all') {
        prevIndex = state.queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    setCurrentQueueIndex(prevIndex);
    play(state.queue[prevIndex]);
  };

  // Add tracks to queue
  const addToQueue = (track: Track | Track[]) => {
    const tracks = Array.isArray(track) ? track : [track];
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, ...tracks],
    }));
  };

  // Remove track from queue
  const removeFromQueue = (index: number) => {
    setState(prev => {
      const newQueue = [...prev.queue];
      newQueue.splice(index, 1);
      return { ...prev, queue: newQueue };
    });

    if (index < currentQueueIndex) {
      setCurrentQueueIndex(currentQueueIndex - 1);
    } else if (index === currentQueueIndex) {
      // If removed current track, play next
      playNext();
    }
  };

  // Clear queue
  const clearQueue = () => {
    setState(prev => ({ ...prev, queue: [] }));
    setCurrentQueueIndex(-1);
  };

  // Play queue of tracks
  const playQueue = (tracks: Track[], startIndex: number = 0) => {
    setState(prev => ({ ...prev, queue: tracks }));
    setCurrentQueueIndex(startIndex);
    play(tracks[startIndex]);
  };

  // Seek to time
  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  };

  // Set volume
  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setState(prev => ({ ...prev, volume }));
    }
  };

  // Toggle shuffle
  const toggleShuffle = () => {
    setState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  };

  // Toggle repeat
  const toggleRepeat = () => {
    setState(prev => {
      const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      return { ...prev, repeatMode: nextMode };
    });
  };

  const value: PlayerContextValue = {
    ...state,
    play,
    pause,
    togglePlayPause,
    stop,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playQueue,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
