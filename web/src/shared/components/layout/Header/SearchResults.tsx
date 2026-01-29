import { useMemo, memo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Disc, User as UserIcon, Music, ListMusic } from 'lucide-react';
import { useAlbumSearch, useTrackSearch } from '@features/home/hooks';
import { useArtistSearch } from '@features/artists/hooks';
import { usePlaylists } from '@features/playlists/hooks/usePlaylists';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { handleAvatarError } from '@shared/utils/avatar.utils';
import { getArtistImageUrl } from '@features/home/hooks';
import type { Artist } from '@features/artists/types';
import type { Album } from '@features/home/types';
import type { Track } from '@shared/types/track.types';
import type { Playlist } from '@features/playlists/types';
import styles from './SearchResults.module.css';

interface SearchResultsProps {
  query: string;
  onClose: () => void;
}

/**
 * SearchResults Component
 * Displays search results grouped by type (Artists, Albums, Tracks)
 * with live search as user types (debounced)
 * Memoized to prevent unnecessary re-renders during typing
 */
export const SearchResults = memo(function SearchResults({ query, onClose }: SearchResultsProps) {
  const [, setLocation] = useLocation();

  // Fetch results from all sources
  const { data: artistData, isLoading: loadingArtists } = useArtistSearch(query, { take: 3 });
  const { data: albums = [], isLoading: loadingAlbums } = useAlbumSearch(query);
  const { data: tracks = [], isLoading: loadingTracks } = useTrackSearch(query, { take: 5 });
  const { data: playlistsData, isLoading: loadingPlaylists } = usePlaylists({ take: 50 });

  // Extract artists array from paginated response
  const artists = artistData?.data || [];

  // Filter playlists by query
  const playlists = useMemo(() => {
    if (!playlistsData?.items || query.length < 2) return [];
    return playlistsData.items
      .filter((playlist) =>
        playlist.name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 3);
  }, [playlistsData?.items, query]);

  const isLoading = loadingArtists || loadingAlbums || loadingTracks || loadingPlaylists;
  const hasResults = artists.length > 0 || albums.length > 0 || tracks.length > 0 || playlists.length > 0;

  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
    onClose();
  }, [setLocation, onClose]);

  if (query.length < 2) {
    return (
      <div className={styles.searchResults}>
        <p className={styles.searchResults__hint}>
          Escribe al menos 2 caracteres para buscar...
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.searchResults}>
        <p className={styles.searchResults__loading}>Buscando...</p>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className={styles.searchResults}>
        <p className={styles.searchResults__empty}>
          No se encontraron resultados para "{query}"
        </p>
      </div>
    );
  }

  return (
    <div className={styles.searchResults}>
      {/* Artists Section */}
      {artists.length > 0 && (
        <div className={styles.searchResults__section}>
          <h3 className={styles.searchResults__sectionTitle}>
            <UserIcon size={16} />
            Artistas
          </h3>
          {artists.map((artist: Artist) => (
            <button
              key={artist.id}
              className={styles.searchResults__item}
              onClick={() => handleNavigate(`/artists/${artist.id}`)}
            >
              <img
                src={getArtistImageUrl(artist.id, 'profile', artist.updatedAt)}
                alt={artist.name}
                className={styles.searchResults__avatar}
                loading="lazy"
                decoding="async"
                onError={handleAvatarError}
              />
              <div className={styles.searchResults__info}>
                <p className={styles.searchResults__name}>{artist.name}</p>
                <p className={styles.searchResults__meta}>Artista</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Albums Section */}
      {albums.length > 0 && (
        <div className={styles.searchResults__section}>
          <h3 className={styles.searchResults__sectionTitle}>
            <Disc size={16} />
            Álbumes
          </h3>
          {albums.slice(0, 4).map((album: Album) => (
            <button
              key={album.id}
              className={styles.searchResults__item}
              onClick={() => handleNavigate(`/album/${album.id}`)}
            >
              <img
                src={getCoverUrl(album.coverImage)}
                alt={album.title}
                className={styles.searchResults__cover}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
              />
              <div className={styles.searchResults__info}>
                <p className={styles.searchResults__name}>{album.title}</p>
                <p className={styles.searchResults__meta}>{album.artist}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Playlists Section */}
      {playlists.length > 0 && (
        <div className={styles.searchResults__section}>
          <h3 className={styles.searchResults__sectionTitle}>
            <ListMusic size={16} />
            Playlists
          </h3>
          {playlists.map((playlist: Playlist) => (
            <button
              key={playlist.id}
              className={styles.searchResults__item}
              onClick={() => handleNavigate(`/playlists/${playlist.id}`)}
            >
              <div className={styles.searchResults__playlistCover}>
                <PlaylistCoverMosaic
                  albumIds={playlist.albumIds || []}
                  playlistName={playlist.name}
                />
              </div>
              <div className={styles.searchResults__info}>
                <p className={styles.searchResults__name}>{playlist.name}</p>
                <p className={styles.searchResults__meta}>
                  {playlist.songCount} {playlist.songCount === 1 ? 'canción' : 'canciones'}
                  {playlist.ownerName && ` • ${playlist.ownerName}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tracks Section */}
      {tracks.length > 0 && (
        <div className={styles.searchResults__section}>
          <h3 className={styles.searchResults__sectionTitle}>
            <Music size={16} />
            Canciones
          </h3>
          {tracks.map((track: Track) => (
            <button
              key={track.id}
              className={styles.searchResults__item}
              onClick={() => handleNavigate(`/album/${track.albumId}`)}
            >
              <img
                src={getCoverUrl(track.albumId ? `/api/albums/${track.albumId}/cover` : undefined)}
                alt={track.title}
                className={styles.searchResults__cover}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
              />
              <div className={styles.searchResults__info}>
                <p className={styles.searchResults__name}>{track.title}</p>
                <p className={styles.searchResults__meta}>
                  {track.artistName || track.artist} • {track.albumTitle || track.albumName}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
