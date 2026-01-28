import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { getAutoPlaylists, refreshWaveMix, type AutoPlaylist } from '@shared/services/recommendations.service';
import { logger } from '@shared/utils/logger';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import { getApiErrorMessage } from '@shared/utils/error.utils';

export function useWaveMixPlaylists() {
  const [, setLocation] = useLocation();
  const [playlists, setPlaylists] = useState<AutoPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAutoPlaylists();
      logger.debug('[WaveMix] Received playlists:', data);
      setPlaylists(data);
    } catch (err) {
      logger.error('[WaveMix] Failed to load:', err);
      setError(getApiErrorMessage(err, 'Error al cargar las playlists'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await refreshWaveMix();
      logger.debug('[WaveMix] Playlists refreshed:', data);
      setPlaylists(data);
    } catch (err) {
      logger.error('[WaveMix] Failed to refresh:', err);
      setError(getApiErrorMessage(err, 'Error al actualizar las playlists'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePlaylistClick = useCallback(
    (playlist: AutoPlaylist) => {
      safeSessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
      safeSessionStorage.setItem('playlistReturnPath', '/wave-mix');
      setLocation(`/wave-mix/${playlist.id}`);
    },
    [setLocation]
  );

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(query) ||
        playlist.description.toLowerCase().includes(query) ||
        playlist.metadata.artistName?.toLowerCase().includes(query)
    );
  }, [playlists, searchQuery]);

  // Separate playlists by type
  const dailyPlaylists = useMemo(
    () => filteredPlaylists.filter((p) => p.type === 'wave-mix'),
    [filteredPlaylists]
  );
  const artistPlaylists = useMemo(
    () => filteredPlaylists.filter((p) => p.type === 'artist'),
    [filteredPlaylists]
  );
  const genrePlaylists = useMemo(
    () => filteredPlaylists.filter((p) => p.type === 'genre'),
    [filteredPlaylists]
  );

  return {
    // State
    playlists,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    clearSearch,

    // Filtered playlists
    dailyPlaylists,
    artistPlaylists,
    genrePlaylists,

    // Actions
    handleRefresh,
    handlePlaylistClick,
  };
}

// Helper to get a random album cover from playlist tracks
export function getPlaylistCoverUrl(playlist: AutoPlaylist): string | undefined {
  if (playlist.coverImageUrl) return playlist.coverImageUrl;

  const albumIds = new Set<string>();
  for (const scoredTrack of playlist.tracks || []) {
    if (scoredTrack.track?.albumId) {
      albumIds.add(scoredTrack.track.albumId);
    }
  }

  const albumIdArray = Array.from(albumIds);
  if (albumIdArray.length === 0) return undefined;

  const randomAlbumId = albumIdArray[Math.floor(Math.random() * albumIdArray.length)];
  return `/api/albums/${randomAlbumId}/cover`;
}
