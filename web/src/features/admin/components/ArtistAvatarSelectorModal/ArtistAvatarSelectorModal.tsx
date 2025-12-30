import { useState } from 'react';
import { X, Check, Loader, AlertCircle, Cloud, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/components/ui';
import { useSearchArtistAvatars, useApplyArtistAvatar } from '../../hooks/useArtistAvatars';
import { AvatarOption, AvatarImageType } from '../../api/artist-avatars.api';
import { FileUploadSection } from './FileUploadSection';
import { metadataService } from '@features/admin/metadata/services/metadataService';
import { logger } from '@shared/utils/logger';
import styles from './ArtistAvatarSelectorModal.module.css';

interface ArtistAvatarSelectorModalProps {
  artistId: string;
  artistName: string;
  defaultType?: AvatarImageType; // Pre-select image type
  allowedTypes?: AvatarImageType[]; // Restrict which types can be selected
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * ArtistAvatarSelectorModal Component
 * Modal para buscar y seleccionar imágenes de artista de múltiples proveedores
 */
type TabType = 'providers' | 'upload';

export function ArtistAvatarSelectorModal({
  artistId,
  artistName,
  defaultType,
  allowedTypes,
  onClose,
  onSuccess,
}: ArtistAvatarSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('providers');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>(defaultType || ''); // Use defaultType if provided
  const [applyError, setApplyError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useSearchArtistAvatars(artistId);
  const { mutate: applyAvatar, isPending: isApplying } = useApplyArtistAvatar();

  const avatars = data?.avatars || [];
  const artistInfo = data?.artistInfo;

  // Get unique providers and types for filters
  const providers = Array.from(new Set(avatars.map((a) => a.provider)));
  const allTypes = Array.from(new Set(avatars.map((a) => a.type).filter(Boolean)));

  // Filter types based on allowedTypes prop (if provided)
  const types = allowedTypes
    ? allTypes.filter((type): type is AvatarImageType => type !== undefined && allowedTypes.includes(type))
    : allTypes;

  // Filter avatars
  const filteredAvatars = avatars.filter((a) => {
    // Filter by allowed types (if specified)
    if (allowedTypes && a.type && !allowedTypes.includes(a.type)) return false;
    if (providerFilter && a.provider !== providerFilter) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    return true;
  });

  const handleApply = () => {
    if (!selectedAvatar || !selectedAvatar.type) return;

    setApplyError(null);
    applyAvatar(
      {
        artistId,
        avatarUrl: selectedAvatar.url,
        provider: selectedAvatar.provider,
        type: selectedAvatar.type,
      },
      {
        onSuccess: async () => {
          // FALLBACK: Force manual refetch in case WebSocket fails
          // This ensures the UI updates even if the WebSocket event doesn't arrive

          // Immediate refetch
          await queryClient.refetchQueries({
            queryKey: ['artists', artistId],
            type: 'active'
          });

          // Refetch artist images
          await queryClient.refetchQueries({
            queryKey: ['artist-images', artistId],
            type: 'active'
          });

          // Delayed refetch to ensure backend has fully processed the image
          setTimeout(() => {
            queryClient.refetchQueries({
              queryKey: ['artists', artistId],
              type: 'active'
            });
          }, 1000);

          onSuccess?.();
          onClose();
        },
        onError: (error: any) => {
          if (import.meta.env.DEV) {
            logger.error('[ArtistAvatarSelector] ❌ Error applying avatar:', error);
          }
          setApplyError(error?.response?.data?.message || error?.message || 'Error al aplicar la imagen');
        },
      },
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      profile: 'Perfil',
      background: 'Fondo',
      banner: 'Banner',
      logo: 'Logo',
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      profile: styles.typeBadgeProfile,
      background: styles.typeBadgeBackground,
      banner: styles.typeBadgeBanner,
      logo: styles.typeBadgeLogo,
    };
    return colors[type] || '';
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Seleccionar imagen de artista</h2>
            <p className={styles.subtitle}>{artistInfo?.name || artistName}</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
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

        {/* Body */}
        <div className={styles.body}>
          {activeTab === 'providers' ? (
            isLoading ? (
            <div className={styles.loading}>
              <Loader className={styles.spinner} size={48} />
              <p>Buscando imágenes en todos los proveedores...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <AlertCircle size={48} />
              <p>Error al buscar imágenes</p>
              <span>{(error as Error).message}</span>
            </div>
          ) : avatars.length === 0 ? (
            <div className={styles.empty}>
              <AlertCircle size={48} />
              <p>No se encontraron imágenes</p>
              <span>
                No hay imágenes disponibles en ningún proveedor para este artista
              </span>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className={styles.filterSection}>
                {/* Type Filter */}
                {types.length > 1 && (
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Tipo:</label>
                    <select
                      className={styles.filterSelect}
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setSelectedAvatar(null);
                      }}
                    >
                      <option value="">Todos ({avatars.length})</option>
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {getTypeLabel(type || '')} (
                          {avatars.filter((a) => a.type === type).length})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Provider Filter */}
                {providers.length > 1 && (
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Proveedor:</label>
                    <select
                      className={styles.filterSelect}
                      value={providerFilter}
                      onChange={(e) => {
                        setProviderFilter(e.target.value);
                        setSelectedAvatar(null);
                      }}
                    >
                      <option value="">Todos</option>
                      {providers.map((provider) => (
                        <option key={provider} value={provider}>
                          {metadataService.getProviderLabel(provider)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Gallery */}
              <div className={styles.gallery}>
                {filteredAvatars.map((avatar, index) => (
                  <div
                    key={`${avatar.provider}-${avatar.type}-${index}`}
                    className={`${styles.avatarCard} ${
                      selectedAvatar === avatar ? styles.avatarCardSelected : ''
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    {selectedAvatar === avatar && (
                      <div className={styles.selectedBadge}>
                        <Check size={20} />
                      </div>
                    )}
                    <div className={styles.imageWrapper}>
                      <img
                        src={avatar.thumbnailUrl || avatar.url}
                        alt={`${avatar.provider} ${avatar.type}`}
                        className={styles.image}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/images/avatar-default.svg';
                        }}
                      />
                    </div>
                    <div className={styles.avatarInfo}>
                      {avatar.type && (
                        <span
                          className={`${styles.typeBadge} ${getTypeBadgeColor(avatar.type)}`}
                        >
                          {getTypeLabel(avatar.type)}
                        </span>
                      )}
                      <span className={styles.provider}>
                        {metadataService.getProviderLabel(avatar.provider)}
                      </span>
                      {avatar.width && avatar.height && (
                        <span className={styles.resolution}>
                          {avatar.width}×{avatar.height} px{avatar.provider === 'fanart' ? ' (est.)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
          ) : (
            /* Upload Tab */
            <FileUploadSection
              artistId={artistId}
              imageType={defaultType || (allowedTypes && allowedTypes[0]) || 'profile'}
              onSuccess={() => {
                onSuccess?.();
                onClose();
              }}
            />
          )}
        </div>

        {/* Error message */}
        {applyError && activeTab === 'providers' && (
          <div className={styles.errorMessage}>
            <AlertCircle size={16} />
            <span>{applyError}</span>
          </div>
        )}

        {/* Footer - Only show for providers tab */}
        {activeTab === 'providers' && !isLoading && !error && avatars.length > 0 && (
          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose} disabled={isApplying}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              disabled={!selectedAvatar || isApplying}
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
