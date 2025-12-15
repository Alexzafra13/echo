import { useState } from 'react';
import { useLocation } from 'wouter';
import { Download, Check, Loader2 } from 'lucide-react';
import type { SharedAlbum } from '../../types';
import { useStartImport } from '../../hooks/useSharedLibraries';
import styles from './SharedAlbumGrid.module.css';

interface SharedAlbumGridProps {
  title?: string;
  albums: SharedAlbum[];
  showViewAll?: boolean;
  viewAllPath?: string;
  mobileScroll?: boolean;
  showImportButton?: boolean;
  showServerBadge?: boolean;
}

/**
 * SharedAlbumGrid Component
 * Displays a grid of shared albums from connected servers
 */
export function SharedAlbumGrid({
  title,
  albums,
  showViewAll = false,
  viewAllPath = '/shared-libraries',
  mobileScroll = false,
  showImportButton = true,
  showServerBadge = true,
}: SharedAlbumGridProps) {
  const [, setLocation] = useLocation();
  const startImport = useStartImport();
  const [importingAlbums, setImportingAlbums] = useState<Set<string>>(new Set());
  const [importedAlbums, setImportedAlbums] = useState<Set<string>>(new Set());

  const handleAlbumClick = (album: SharedAlbum) => {
    // Navigate to shared libraries page with server and album pre-selected
    setLocation(`/shared-libraries?server=${album.serverId}&album=${album.id}`);
  };

  const handleViewAllClick = () => {
    setLocation(viewAllPath);
  };

  const handleImportClick = async (e: React.MouseEvent, album: SharedAlbum) => {
    e.stopPropagation(); // Don't trigger album click

    const albumKey = `${album.serverId}-${album.id}`;
    if (importingAlbums.has(albumKey) || importedAlbums.has(albumKey)) {
      return;
    }

    setImportingAlbums((prev) => new Set(prev).add(albumKey));

    try {
      await startImport.mutateAsync({
        serverId: album.serverId,
        remoteAlbumId: album.id,
      });
      setImportedAlbums((prev) => new Set(prev).add(albumKey));
    } catch (error) {
      console.error('Failed to start import:', error);
    } finally {
      setImportingAlbums((prev) => {
        const newSet = new Set(prev);
        newSet.delete(albumKey);
        return newSet;
      });
    }
  };

  if (!albums || albums.length === 0) {
    return null;
  }

  return (
    <section className={styles.sharedAlbumGrid}>
      {title && (
        <div className={styles.sharedAlbumGrid__header}>
          <h2 className={styles.sharedAlbumGrid__title}>{title}</h2>
          {showViewAll && (
            <button
              className={styles.sharedAlbumGrid__viewAllButton}
              onClick={handleViewAllClick}
            >
              Ver todos
            </button>
          )}
        </div>
      )}
      <div className={`${styles.sharedAlbumGrid__grid} ${mobileScroll ? styles['sharedAlbumGrid__grid--mobileScroll'] : ''}`}>
        {albums.map((album) => {
          const albumKey = `${album.serverId}-${album.id}`;
          const isImporting = importingAlbums.has(albumKey);
          const isImported = importedAlbums.has(albumKey);

          return (
            <div
              key={albumKey}
              className={styles.sharedAlbumGrid__card}
              onClick={() => handleAlbumClick(album)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAlbumClick(album);
              }}
            >
              <div className={styles.sharedAlbumGrid__coverWrapper}>
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.name}
                    className={styles.sharedAlbumGrid__cover}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.sharedAlbumGrid__coverPlaceholder}>
                    <span>🎵</span>
                  </div>
                )}
                {showServerBadge && (
                  <div className={styles.sharedAlbumGrid__serverBadge}>
                    {album.serverName}
                  </div>
                )}
                {showImportButton && (
                  <button
                    className={`${styles.sharedAlbumGrid__importButton} ${isImported ? styles['sharedAlbumGrid__importButton--success'] : ''}`}
                    onClick={(e) => handleImportClick(e, album)}
                    disabled={isImporting || isImported}
                    title={isImported ? 'Importado' : 'Importar a mi servidor'}
                  >
                    {isImporting ? (
                      <Loader2 size={16} className={styles.sharedAlbumGrid__spinner} />
                    ) : isImported ? (
                      <Check size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                )}
              </div>
              <div className={styles.sharedAlbumGrid__info}>
                <h3 className={styles.sharedAlbumGrid__albumTitle}>{album.name}</h3>
                <p className={styles.sharedAlbumGrid__artist}>{album.artistName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
