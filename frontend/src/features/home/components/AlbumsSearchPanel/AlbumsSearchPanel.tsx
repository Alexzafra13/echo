import { useLocation } from 'wouter';
import { Disc } from 'lucide-react';
import { useAlbumSearch } from '@features/home/hooks';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import styles from './AlbumsSearchPanel.module.css';

interface AlbumsSearchPanelProps {
  isOpen: boolean;
  query: string;
  onClose: () => void;
}

/**
 * AlbumsSearchPanel Component
 * Expandable panel for searching albums only
 * Simpler than general SearchPanel - shows only albums
 */
export function AlbumsSearchPanel({ isOpen, query, onClose }: AlbumsSearchPanelProps) {
  const [, setLocation] = useLocation();

  // Fetch albums matching the search query
  const { data: albums = [], isLoading } = useAlbumSearch(query);

  const handleNavigate = (albumId: string) => {
    setLocation(`/album/${albumId}`);
    onClose();
  };

  if (!isOpen || query.length < 2) return null;

  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchPanel__container}>
        {isLoading ? (
          <div className={styles.searchPanel__loading}>
            <div className={styles.searchPanel__spinner}></div>
            <p>Buscando álbumes...</p>
          </div>
        ) : albums.length > 0 ? (
          <div className={styles.searchPanel__results}>
            <div className={styles.searchPanel__header}>
              <h3 className={styles.searchPanel__title}>
                <Disc size={18} />
                Resultados para "{query}"
              </h3>
              <span className={styles.searchPanel__count}>
                {albums.length} {albums.length === 1 ? 'álbum' : 'álbumes'}
              </span>
            </div>

            <div className={styles.searchPanel__grid}>
              {albums.slice(0, 20).map((album: any) => (
                <button
                  key={album.id}
                  className={styles.searchPanel__item}
                  onClick={() => handleNavigate(album.id)}
                >
                  <img
                    src={getCoverUrl(album.coverImage)}
                    alt={album.title}
                    className={styles.searchPanel__itemImage}
                    onError={handleImageError}
                  />
                  <div className={styles.searchPanel__itemInfo}>
                    <p className={styles.searchPanel__itemName}>{album.title}</p>
                    <p className={styles.searchPanel__itemMeta}>
                      {album.artist} • {album.year || 'N/A'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.searchPanel__empty}>
            <p className={styles.searchPanel__emptyTitle}>
              No se encontraron álbumes
            </p>
            <p className={styles.searchPanel__emptyText}>
              Intenta con otro título o artista
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
