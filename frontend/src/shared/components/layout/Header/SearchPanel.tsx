import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { Disc, User as UserIcon, Music, ListMusic } from 'lucide-react';
import { useAlbumSearch, useTrackSearch } from '@features/home/hooks';
import { useArtistSearch } from '@features/artists/hooks';
import { usePlaylists } from '@features/playlists/hooks/usePlaylists';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { getArtistImageUrl } from '@features/home/hooks';
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

  // Fetch results from all sources
  const { data: artistData, isLoading: loadingArtists } = useArtistSearch(query, { take: 5 });
  const { data: albums = [], isLoading: loadingAlbums } = useAlbumSearch(query);
  const { data: tracks = [], isLoading: loadingTracks } = useTrackSearch(query, { take: 8 });
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
      .slice(0, 5);
  }, [playlistsData?.items, query]);

  const isLoading = loadingArtists || loadingAlbums || loadingTracks || loadingPlaylists;
  const hasResults = artists.length > 0 || albums.length > 0 || tracks.length > 0 || playlists.length > 0;

  const handleNavigate = (path: string) => {
    setLocation(path);
    onClose();
  };

  // Handle avatar image error - fallback to default avatar
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const defaultAvatar = '/images/empy_cover/empy_cover_default.png';
    if (img.src !== defaultAvatar) {
      img.src = defaultAvatar;
    }
  };

  if (!isOpen || query.length < 2) return null;

  return (
    <div className={styles.searchPanel}>
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
                Resultados para "{query}"
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
                    {artists.map((artist: any) => (
                      <button
                        key={artist.id}
                        className={styles.searchPanel__item}
                        onClick={() => handleNavigate(`/artists/${artist.id}`)}
                      >
                        <img
                          src={getArtistImageUrl(artist.id, 'profile')}
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
                    {albums.slice(0, 6).map((album: any) => (
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
                    {playlists.map((playlist: any) => (
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
                    {tracks.map((track: any) => (
                      <button
                        key={track.id}
                        className={styles.searchPanel__item}
                        onClick={() => handleNavigate(`/album/${track.albumId}`)}
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
