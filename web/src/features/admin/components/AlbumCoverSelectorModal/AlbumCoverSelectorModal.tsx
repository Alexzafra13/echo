import { useState } from 'react';
import { X, Check, Loader, AlertCircle, Cloud, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/components/ui';
import { useSearchAlbumCovers, useApplyAlbumCover } from '../../hooks/useAlbumCovers';
import { CoverOption } from '../../api/album-covers.api';
import { AlbumCoverUploadTab } from './AlbumCoverUploadTab';
import { metadataService } from '@features/admin/metadata/services/metadataService';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './AlbumCoverSelectorModal.module.css';

interface AlbumCoverSelectorModalProps {
  albumId: string;
  albumName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type TabType = 'providers' | 'upload';

export function AlbumCoverSelectorModal({
  albumId,
  albumName: _albumName,
  onClose,
  onSuccess,
}: AlbumCoverSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('providers');
  const [selectedCover, setSelectedCover] = useState<CoverOption | null>(null);
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [applyError, setApplyError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useSearchAlbumCovers(albumId);
  const { mutate: applyCover, isPending: isApplying } = useApplyAlbumCover();

  const covers = data?.covers || [];
  const albumInfo = data?.albumInfo;

  const providers = Array.from(new Set(covers.map((c) => c.provider)));

  const filteredCovers = providerFilter
    ? covers.filter((c) => c.provider === providerFilter)
    : covers;

  const handleApply = () => {
    if (!selectedCover) return;

    setApplyError(null);
    applyCover(
      {
        albumId,
        coverUrl: selectedCover.url,
        provider: selectedCover.provider,
      },
      {
        onSuccess: async () => {
          // Refetch manual por si falla el WebSocket
          await queryClient.refetchQueries({
            queryKey: ['albums', albumId],
            type: 'active'
          });

          await queryClient.refetchQueries({
            queryKey: ['albums'],
            type: 'active'
          });

          if (albumInfo?.artistId) {
            await queryClient.refetchQueries({
              queryKey: ['artists', albumInfo.artistId],
              type: 'active'
            });
          }

          // Refetch retrasado para asegurar procesamiento del backend
          setTimeout(() => {
            queryClient.refetchQueries({
              queryKey: ['albums', albumId],
              type: 'active'
            });
          }, 1000);

          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          if (import.meta.env.DEV) {
            logger.error('[AlbumCoverSelector] ❌ Error applying cover:', err);
          }
          setApplyError(getApiErrorMessage(err, 'Error al aplicar la carátula'));
        },
      },
    );
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
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

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'providers' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('providers')}
          >
            <Cloud size={18} />
            <span>Proveedores externos</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'upload' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={18} />
            <span>Subir desde PC</span>
          </button>
        </div>

        <div className={styles.body}>
          {activeTab === 'providers' ? (
            isLoading ? (
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
                          {metadataService.getProviderLabel(provider)} (
                          {covers.filter((c) => c.provider === provider).length})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                          {metadataService.getProviderLabel(cover.provider)}
                        </span>
                        {cover.width && cover.height && (
                          <span className={styles.coverResolution}>
                            {cover.width}×{cover.height} px{cover.provider === 'fanart' ? ' (est.)' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            <AlbumCoverUploadTab
              albumId={albumId}
              onSuccess={() => {
                onSuccess?.();
                onClose();
              }}
            />
          )}
        </div>

        {applyError && activeTab === 'providers' && (
          <div className={styles.errorMessage}>
            <AlertCircle size={16} />
            <span>{applyError}</span>
          </div>
        )}

        {activeTab === 'providers' && !isLoading && !error && covers.length > 0 && (
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
