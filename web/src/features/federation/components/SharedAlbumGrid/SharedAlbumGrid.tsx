import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Download, Check, Loader2, Users, Plus, AlertTriangle, X } from 'lucide-react';
import { AxiosError } from 'axios';
import type { SharedAlbum } from '../../types';
import { useStartImport, useConnectedServers, useImports } from '../../hooks/useSharedLibraries';
import { useAuthStore } from '@shared/store/authStore';
import { logger } from '@shared/utils/logger';
import styles from './SharedAlbumGrid.module.css';

interface SharedAlbumGridProps {
  title?: string;
  albums: SharedAlbum[];
  showViewAll?: boolean;
  viewAllPath?: string;
  mobileScroll?: boolean;
  /** Mobile layout: 'scroll' for horizontal carousel, 'grid' for standard grid */
  mobileLayout?: 'scroll' | 'grid';
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
  viewAllPath = '/albums?source=shared',
  mobileScroll = false,
  mobileLayout = 'scroll',
  showImportButton = true,
  showServerBadge = true,
  showEmptyState = false,
}: SharedAlbumGridProps) {
  const [, setLocation] = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin === true;
  const startImport = useStartImport();
  const [importingAlbums, setImportingAlbums] = useState<Set<string>>(new Set());
  const [importedAlbums, setImportedAlbums] = useState<Set<string>>(new Set());
  const [importError, setImportError] = useState<{ message: string; serverName?: string } | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);
  const { data: servers } = useConnectedServers();
  const { data: existingImports } = useImports();

  // Build set of already-imported album keys from backend data
  const alreadyImportedKeys = useMemo(() => {
    if (!existingImports) return new Set<string>();
    return new Set(
      existingImports
        .filter((imp) => imp.status === 'completed' || imp.status === 'downloading' || imp.status === 'pending')
        .map((imp) => `${imp.connectedServerId}-${imp.remoteAlbumId}`)
    );
  }, [existingImports]);

  // Function to dismiss error with animation
  const dismissError = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setImportError(null);
      setIsDismissing(false);
    }, 400); // Match animation duration
  };

  // Auto-dismiss error notification after 5 seconds
  useEffect(() => {
    if (importError && !isDismissing) {
      const timer = setTimeout(() => {
        dismissError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [importError, isDismissing]);

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
      if (import.meta.env.DEV) {
        logger.error('Failed to start import:', error);
      }

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
              Ver todos →
            </button>
          )}
        </div>
      )}

      {/* Error banner */}
      {importError && (
        <div className={`${styles.sharedAlbumGrid__errorBanner} ${isDismissing ? styles['sharedAlbumGrid__errorBanner--dismissing'] : ''}`} role="alert">
          <AlertTriangle size={20} />
          <div className={styles.sharedAlbumGrid__errorContent}>
            <span className={styles.sharedAlbumGrid__errorMessage}>{importError.message}</span>
          </div>
          <button
            className={styles.sharedAlbumGrid__errorClose}
            onClick={dismissError}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className={`${styles.sharedAlbumGrid__grid} ${mobileScroll ? styles['sharedAlbumGrid__grid--mobileScroll'] : ''} ${mobileLayout === 'grid' ? styles['sharedAlbumGrid__grid--mobileGrid'] : ''}`}>
        {albums.map((album) => {
          const albumKey = `${album.serverId}-${album.id}`;
          const isImporting = importingAlbums.has(albumKey);
          const isImported = importedAlbums.has(albumKey) || alreadyImportedKeys.has(albumKey);

          return (
            <div
              key={albumKey}
              className={styles.sharedAlbumGrid__card}
              onClick={() => handleAlbumClick(album)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAlbumClick(album);
                }
              }}
            >
              <div className={styles.sharedAlbumGrid__coverWrapper}>
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.name}
                    className={styles.sharedAlbumGrid__cover}
                    loading="lazy"
                    decoding="async"
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
                {showImportButton && isAdmin && (
                  <button
                    className={`${styles.sharedAlbumGrid__importButton} ${isImported ? styles['sharedAlbumGrid__importButton--success'] : ''}`}
                    onClick={(e) => handleImportClick(e, album)}
                    disabled={isImporting || isImported}
                    title={isImported ? 'Importado' : 'Importar a mi servidor'}
                    aria-label={isImported ? `${album.name} importado` : `Importar ${album.name}`}
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
