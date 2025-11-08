import { useState } from 'react';
import { X, Check, Loader, AlertCircle } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useSearchAlbumCovers, useApplyAlbumCover } from '../../hooks/useAlbumCovers';
import { CoverOption } from '../../api/album-covers.api';
import styles from './AlbumCoverSelectorModal.module.css';

interface AlbumCoverSelectorModalProps {
  albumId: string;
  albumName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * AlbumCoverSelectorModal Component
 * Modal para buscar y seleccionar carátulas de álbum de múltiples proveedores
 */
export function AlbumCoverSelectorModal({
  albumId,
  albumName,
  onClose,
  onSuccess,
}: AlbumCoverSelectorModalProps) {
  const [selectedCover, setSelectedCover] = useState<CoverOption | null>(null);
  const [providerFilter, setProviderFilter] = useState<string>('');

  const { data, isLoading, error } = useSearchAlbumCovers(albumId);
  const { mutate: applyCover, isPending: isApplying } = useApplyAlbumCover();

  const covers = data?.covers || [];
  const albumInfo = data?.albumInfo;

  // Get unique providers for filter
  const providers = Array.from(new Set(covers.map((c) => c.provider)));

  // Filter covers by provider
  const filteredCovers = providerFilter
    ? covers.filter((c) => c.provider === providerFilter)
    : covers;

  const handleApply = () => {
    if (!selectedCover) return;

    applyCover(
      {
        albumId,
        coverUrl: selectedCover.url,
        provider: selectedCover.provider,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
      },
    );
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      coverartarchive: 'Cover Art Archive',
      fanart: 'Fanart.tv',
      musicbrainz: 'MusicBrainz',
      lastfm: 'Last.fm',
      spotify: 'Spotify',
    };
    return labels[provider] || provider;
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Seleccionar carátula</h2>
            <p className={styles.subtitle}>
              {albumInfo?.name} - {albumInfo?.artistName}
            </p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loading}>
              <Loader className={styles.spinner} size={48} />
              <p>Buscando carátulas en todos los proveedores...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <AlertCircle size={48} />
              <p>Error al buscar carátulas</p>
              <span>{(error as Error).message}</span>
            </div>
          ) : covers.length === 0 ? (
            <div className={styles.empty}>
              <AlertCircle size={48} />
              <p>No se encontraron carátulas</p>
              <span>
                No hay carátulas disponibles en ningún proveedor para este álbum
              </span>
            </div>
          ) : (
            <>
              {/* Filter */}
              {providers.length > 1 && (
                <div className={styles.filterSection}>
                  <label className={styles.filterLabel}>Proveedor:</label>
                  <select
                    className={styles.filterSelect}
                    value={providerFilter}
                    onChange={(e) => {
                      setProviderFilter(e.target.value);
                      setSelectedCover(null);
                    }}
                  >
                    <option value="">Todos ({covers.length})</option>
                    {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {getProviderLabel(provider)} (
                        {covers.filter((c) => c.provider === provider).length})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gallery */}
              <div className={styles.gallery}>
                {filteredCovers.map((cover, index) => (
                  <div
                    key={`${cover.provider}-${index}`}
                    className={`${styles.coverCard} ${
                      selectedCover === cover ? styles.coverCardSelected : ''
                    }`}
                    onClick={() => setSelectedCover(cover)}
                  >
                    {selectedCover === cover && (
                      <div className={styles.selectedBadge}>
                        <Check size={20} />
                      </div>
                    )}
                    <div className={styles.coverImageWrapper}>
                      <img
                        src={cover.thumbnailUrl || cover.url}
                        alt={`${cover.provider} cover`}
                        className={styles.coverImage}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-album.png';
                        }}
                      />
                    </div>
                    <div className={styles.coverInfo}>
                      <span className={styles.coverProvider}>
                        {getProviderLabel(cover.provider)}
                      </span>
                      {cover.width && cover.height && (
                        <span className={styles.coverResolution}>
                          {cover.width}×{cover.height}
                        </span>
                      )}
                      {cover.size && (
                        <span className={styles.coverSize}>
                          {cover.size.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && covers.length > 0 && (
          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose} disabled={isApplying}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              disabled={!selectedCover || isApplying}
              loading={isApplying}
            >
              {isApplying ? 'Aplicando...' : 'Aplicar selección'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
