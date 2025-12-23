import { useState } from 'react';
import { useLocation } from 'wouter';
import { Download, Check, Loader2, Users, Plus, AlertTriangle, X } from 'lucide-react';
import { AxiosError } from 'axios';
import type { SharedAlbum } from '../../types';
import { useStartImport, useConnectedServers } from '../../hooks/useSharedLibraries';
import styles from './SharedAlbumGrid.module.css';

interface SharedAlbumGridProps {
  title?: string;
  albums: SharedAlbum[];
  showViewAll?: boolean;
  viewAllPath?: string;
  mobileScroll?: boolean;
  showImportButton?: boolean;
  showServerBadge?: boolean;
  /** Show empty state when no servers connected (for home page) */
  showEmptyState?: boolean;
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
  showEmptyState = false,
}: SharedAlbumGridProps) {
  const [, setLocation] = useLocation();
  const startImport = useStartImport();
  const [importingAlbums, setImportingAlbums] = useState<Set<string>>(new Set());
  const [importedAlbums, setImportedAlbums] = useState<Set<string>>(new Set());
  const [importError, setImportError] = useState<{ message: string; serverName?: string } | null>(null);
  const { data: servers } = useConnectedServers();

  const handleAlbumClick = (album: SharedAlbum) => {
    // Navigate to federation album detail page
    setLocation(`/federation/album/${album.serverId}/${album.id}`);
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

    // Clear previous error
    setImportError(null);
    setImportingAlbums((prev) => new Set(prev).add(albumKey));

    try {
      await startImport.mutateAsync({
        serverId: album.serverId,
        remoteAlbumId: album.id,
      });
      setImportedAlbums((prev) => new Set(prev).add(albumKey));
    } catch (error) {
      console.error('Failed to start import:', error);

      // Parse error to show user-friendly message
      let errorMessage = 'Error al importar el álbum';

      if (error instanceof AxiosError && error.response) {
        const status = error.response.status;
        const data = error.response.data as { message?: string };

        if (status === 403 && data?.message?.includes('Download permission')) {
          errorMessage = `El servidor "${album.serverName}" no te ha dado permiso para descargar. Pídele que active el permiso "Descargar" en su panel de federación.`;
        } else if (status === 403) {
          errorMessage = `No tienes permiso para importar desde "${album.serverName}"`;
        } else if (status === 404) {
          errorMessage = 'El álbum ya no está disponible en el servidor remoto';
        } else if (data?.message) {
          errorMessage = data.message;
        }
      }

      setImportError({ message: errorMessage, serverName: album.serverName });
    } finally {
      setImportingAlbums((prev) => {
        const newSet = new Set(prev);
        newSet.delete(albumKey);
        return newSet;
      });
    }
  };

  // Show empty state when enabled and no servers or no albums
  if (!albums || albums.length === 0) {
    if (!showEmptyState) {
      return null;
    }

    const hasServers = servers && servers.length > 0;

    return (
      <section className={styles.sharedAlbumGrid}>
        {title && (
          <div className={styles.sharedAlbumGrid__header}>
            <h2 className={styles.sharedAlbumGrid__title}>{title}</h2>
          </div>
        )}
        <div className={styles.sharedAlbumGrid__emptyState}>
          <Users size={48} className={styles.sharedAlbumGrid__emptyIcon} />
          {hasServers ? (
            <>
              <h3>Los servidores conectados no tienen álbums</h3>
              <p>Los servidores a los que estás conectado aún no tienen música disponible.</p>
            </>
          ) : (
            <>
              <h3>Conecta con amigos</h3>
              <p>Conecta con los servidores Echo de tus amigos para ver su música aquí.</p>
              <button
                className={styles.sharedAlbumGrid__emptyButton}
                onClick={() => setLocation('/admin?tab=federation')}
              >
                <Plus size={18} />
                Conectar servidor
              </button>
            </>
          )}
        </div>
      </section>
    );
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

      {/* Error banner */}
      {importError && (
        <div className={styles.sharedAlbumGrid__errorBanner}>
          <AlertTriangle size={20} />
          <div className={styles.sharedAlbumGrid__errorContent}>
            <span className={styles.sharedAlbumGrid__errorMessage}>{importError.message}</span>
          </div>
          <button
            className={styles.sharedAlbumGrid__errorClose}
            onClick={() => setImportError(null)}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
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
