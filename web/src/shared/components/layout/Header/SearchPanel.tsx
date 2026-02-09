import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Disc, User as UserIcon, Music, ListMusic } from 'lucide-react';
import { useAlbumSearch, useTrackSearch } from '@features/home/hooks';
import { useArtistSearch } from '@features/artists/hooks';
import { usePlaylists } from '@features/playlists/hooks/usePlaylists';
import { usePlayer } from '@features/player';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { handleAvatarError } from '@shared/utils/avatar.utils';
import { toPlayerTracks } from '@shared/utils/track.utils';
import { getArtistImageUrl } from '@features/home/hooks';
import type { Artist } from '@features/artists/types';
import type { Album } from '@features/home/types';
import type { Track } from '@shared/types/track.types';
import type { Playlist } from '@features/playlists/types';
import styles from './SearchPanel.module.css';

interface SearchPanelProps {
  isOpen: boolean;
  query: string;
  onClose: () => void;
}

/**
 * SearchPanel Component
 * Expandable panel that shows search results below header
 * Similar to YouTube/Spotify search - pushes content down instead of overlaying
 */
export function SearchPanel({ isOpen, query, onClose }: SearchPanelProps) {
  const [, setLocation] = useLocation();
  const { playQueue } = usePlayer();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Store the last valid query to use during closing animation
  const lastValidQuery = useRef(query);
  if (query.length >= 2) {
    lastValidQuery.current = query;
  }

  // Use the appropriate query - current if valid, last valid if closing
  const searchQuery = isClosing ? lastValidQuery.current : query;

  // Handle open/close transitions
  useEffect(() => {
    const shouldShow = isOpen && query.length >= 2;

    if (shouldShow && !isVisible) {
      // Opening
      setIsClosing(false);
      setIsVisible(true);
    } else if (!shouldShow && isVisible) {
      // Closing - animate out first
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 250); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, query, isVisible]);

  // Fetch results from all sources - use searchQuery to maintain results during close animation
  const { data: artistData, isLoading: loadingArtists } = useArtistSearch(searchQuery, { take: 5 });
  const { data: albums = [], isLoading: loadingAlbums } = useAlbumSearch(searchQuery);
  const { data: tracks = [], isLoading: loadingTracks } = useTrackSearch(searchQuery, { take: 8 });
  const { data: playlistsData, isLoading: loadingPlaylists } = usePlaylists({ take: 50 });

  // Extract artists array from paginated response
  const artists = artistData?.data || [];

  // Filter playlists by query
  const playlists = useMemo(() => {
    if (!playlistsData?.items || searchQuery.length < 2) return [];
    return playlistsData.items
      .filter((playlist) =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 5);
  }, [playlistsData?.items, searchQuery]);

  // Don't show loading state when closing - just show the existing results
  const isLoading = !isClosing && (loadingArtists || loadingAlbums || loadingTracks || loadingPlaylists);
  const hasResults = artists.length > 0 || albums.length > 0 || tracks.length > 0 || playlists.length > 0;

  const handleNavigate = (path: string) => {
    setLocation(path);
    onClose();
  };

  // Handle track click - play the track and queue remaining search results
  const handlePlayTrack = (_track: Track, index: number) => {
    // Convert search results to player Track format and play
    const playerTracks = toPlayerTracks(tracks);
    playQueue(playerTracks, index);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div id="header-search-results" role="listbox" aria-label="Resultados de búsqueda" className={`${styles.searchPanel} ${isClosing ? styles['searchPanel--closing'] : ''}`}>
      <div className={styles.searchPanel__container}>
        {isLoading ? (
          <div className={styles.searchPanel__loading}>
            <div className={styles.searchPanel__spinner}></div>
            <p>Buscando...</p>
          </div>
        ) : hasResults ? (
          <div className={styles.searchPanel__results}>
            <div className={styles.searchPanel__header}>
              <h3 className={styles.searchPanel__title}>
                Resultados para "{searchQuery}"
              </h3>
            </div>

            <div className={styles.searchPanel__sections}>
              {/* Artists Section */}
              {artists.length > 0 && (
                <div className={styles.searchPanel__section}>
                  <h4 className={styles.searchPanel__sectionTitle}>
                    <UserIcon size={16} />
                    Artistas
                  </h4>
                  <div className={styles.searchPanel__grid}>
                    {artists.map((artist: Artist) => (
                      <button
                        key={artist.id}
                        className={styles.searchPanel__item}
                        onClick={() => handleNavigate(`/artists/${artist.id}`)}
                      >
                        <img
                          src={getArtistImageUrl(artist.id, 'profile', artist.updatedAt)}
                          alt={artist.name}
                          className={styles.searchPanel__itemImage}
                          onError={handleAvatarError}
                        />
                        <div className={styles.searchPanel__itemInfo}>
                          <p className={styles.searchPanel__itemName}>{artist.name}</p>
                          <p className={styles.searchPanel__itemMeta}>Artista</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums Section */}
              {albums.length > 0 && (
                <div className={styles.searchPanel__section}>
                  <h4 className={styles.searchPanel__sectionTitle}>
                    <Disc size={16} />
                    Álbumes
                  </h4>
                  <div className={styles.searchPanel__grid}>
                    {albums.slice(0, 6).map((album: Album) => (
                      <button
                        key={album.id}
                        className={styles.searchPanel__item}
                        onClick={() => handleNavigate(`/album/${album.id}`)}
                      >
                        <img
                          src={getCoverUrl(album.coverImage)}
                          alt={album.title}
                          className={styles.searchPanel__itemImage}
                          onError={handleImageError}
                        />
                        <div className={styles.searchPanel__itemInfo}>
                          <p className={styles.searchPanel__itemName}>{album.title}</p>
                          <p className={styles.searchPanel__itemMeta}>{album.artist}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Playlists Section */}
              {playlists.length > 0 && (
                <div className={styles.searchPanel__section}>
                  <h4 className={styles.searchPanel__sectionTitle}>
                    <ListMusic size={16} />
                    Playlists
                  </h4>
                  <div className={styles.searchPanel__grid}>
                    {playlists.map((playlist: Playlist) => (
                      <button
                        key={playlist.id}
                        className={styles.searchPanel__item}
                        onClick={() => handleNavigate(`/playlists/${playlist.id}`)}
                      >
                        <div className={styles.searchPanel__playlistCover}>
                          <PlaylistCoverMosaic
                            albumIds={playlist.albumIds || []}
                            playlistName={playlist.name}
                          />
                        </div>
                        <div className={styles.searchPanel__itemInfo}>
                          <p className={styles.searchPanel__itemName}>{playlist.name}</p>
                          <p className={styles.searchPanel__itemMeta}>
                            {playlist.songCount} {playlist.songCount === 1 ? 'canción' : 'canciones'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracks Section */}
              {tracks.length > 0 && (
                <div className={styles.searchPanel__section}>
                  <h4 className={styles.searchPanel__sectionTitle}>
                    <Music size={16} />
                    Canciones
                  </h4>
                  <div className={styles.searchPanel__grid}>
                    {tracks.map((track: Track, index: number) => (
                      <button
                        key={track.id}
                        className={styles.searchPanel__item}
                        onClick={() => handlePlayTrack(track, index)}
                      >
                        <img
                          src={getCoverUrl(track.albumId ? `/api/albums/${track.albumId}/cover` : undefined)}
                          alt={track.title}
                          className={styles.searchPanel__itemImage}
                          onError={handleImageError}
                        />
                        <div className={styles.searchPanel__itemInfo}>
                          <p className={styles.searchPanel__itemName}>{track.title}</p>
                          <p className={styles.searchPanel__itemMeta}>
                            {track.artistName || track.artist} • {track.albumTitle || track.albumName}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.searchPanel__empty}>
            <p className={styles.searchPanel__emptyTitle}>
              No se encontraron resultados
            </p>
            <p className={styles.searchPanel__emptyText}>
              Intenta buscar artistas, álbumes, canciones o playlists
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
