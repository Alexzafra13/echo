import { useState } from 'react';
import {
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Music,
  Disc,
} from 'lucide-react';
import { Button } from '@shared/components/ui';
import { formatDateCompact } from '@shared/utils/format';
import { useEnrichmentLogs, useEnrichmentStats } from '../../hooks/useEnrichmentHistory';
import { ListEnrichmentLogsFilters } from '../../api/enrichment.api';
import styles from './HistoryTab.module.css';

/**
 * HistoryTab Component
 * Historial completo de enriquecimientos de metadata con estadísticas y filtros
 */
export function HistoryTab() {
  // Filtros y paginación
  const [filters, setFilters] = useState<ListEnrichmentLogsFilters>({
    skip: 0,
    take: 25,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Queries
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useEnrichmentLogs(filters);
  const { data: statsData, isLoading: statsLoading } = useEnrichmentStats(statsPeriod);

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const pageSize = filters.take || 25;
  const totalPages = Math.ceil(total / pageSize);

  // Handlers
  const handleFilterChange = (newFilters: Partial<ListEnrichmentLogsFilters>) => {
    setFilters({ ...filters, ...newFilters, skip: 0 });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const skip = (page - 1) * pageSize;
    setFilters({ ...filters, skip });
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    refetchLogs();
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      success: styles.badgeSuccess,
      partial: styles.badgePartial,
      error: styles.badgeError,
    };
    const icons = {
      success: <CheckCircle size={14} />,
      partial: <AlertCircle size={14} />,
      error: <XCircle size={14} />,
    };
    const labels = {
      success: 'Éxito',
      partial: 'Parcial',
      error: 'Error',
    };

    return (
      <span className={`${styles.badge} ${classes[status as keyof typeof classes]}`}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getEntityIcon = (type: string) => {
    return type === 'artist' ? <Music size={16} /> : <Disc size={16} />;
  };

  // Build complete image URLs for preview
  const buildImageUrl = (log: {
    previewUrl?: string;
    entityType?: string;
    entityId?: string;
  }): string | null => {
    const value = log.previewUrl;
    if (!value) return null;

    // Already a complete URL (http/https)
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // API path (new format) - just use it directly, the proxy will handle it
    if (value.startsWith('/api/')) {
      return value;
    }

    // Old format: file path - construct API URL using entityId
    // Examples: "uploads\music\..." or "/uploads/music/..."
    if (value.includes('uploads') || value.includes('\\')) {
      if (log.entityType === 'album') {
        return `/api/images/albums/${log.entityId || log.id}/cover`;
      } else if (log.entityType === 'artist') {
        return `/api/images/artists/${log.entityId || log.id}/profile`;
      }
    }

    // Default: treat as relative API path
    return `/api${value.startsWith('/') ? value : '/' + value}`;
  };

  return (
    <div className={styles.container}>
      {/* Statistics Section */}
      {!statsLoading && statsData && (
        <div className={styles.statsSection}>
          <div className={styles.statsHeader}>
            <h3 className={styles.statsTitle}>Estadísticas</h3>
            <div className={styles.periodSelector}>
              {(['today', 'week', 'month', 'all'] as const).map((period) => (
                <button
                  key={period}
                  className={`${styles.periodButton} ${statsPeriod === period ? styles.periodButtonActive : ''}`}
                  onClick={() => setStatsPeriod(period)}
                >
                  {period === 'today' && 'Hoy'}
                  {period === 'week' && 'Semana'}
                  {period === 'month' && 'Mes'}
                  {period === 'all' && 'Todo'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <TrendingUp size={24} />
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Total Enriquecimientos</p>
                <p className={styles.statValue}>{statsData.totalEnrichments}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                <CheckCircle size={24} />
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Tasa de Éxito</p>
                <p className={styles.statValue}>{statsData.successRate}%</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Clock size={24} />
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Tiempo Promedio</p>
                <p className={styles.statValue}>{statsData.averageProcessingTime}ms</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Music size={24} />
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Artistas / Álbumes</p>
                <p className={styles.statValue}>
                  {statsData.byEntityType.artist} / {statsData.byEntityType.album}
                </p>
              </div>
            </div>
          </div>

          {/* Provider Stats */}
          {statsData.byProvider.length > 0 && (
            <div className={styles.providerStats}>
              <h4 className={styles.providerStatsTitle}>Por Proveedor</h4>
              <div className={styles.providerStatsGrid}>
                {statsData.byProvider.map((provider) => (
                  <div key={provider.provider} className={styles.providerStatCard}>
                    <div className={styles.providerStatHeader}>
                      <span className={styles.providerName}>{provider.provider}</span>
                      <span className={styles.providerSuccessRate}>{provider.successRate}%</span>
                    </div>
                    <div className={styles.providerStatCounts}>
                      <span className={styles.providerStatSuccess}>{provider.success} éxito</span>
                      <span className={styles.providerStatPartial}>{provider.partial} parcial</span>
                      <span className={styles.providerStatError}>{provider.error} error</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <div className={styles.historyHeaderLeft}>
            <h3 className={styles.historyTitle}>Historial de Enriquecimientos</h3>
            <p className={styles.historyDescription}>
              {total > 0 ? `${total} registros totales` : 'No hay registros'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            loading={logsLoading}
            leftIcon={<RefreshCw size={16} />}
          >
            Actualizar
          </Button>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={filters.entityType || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange({
                entityType: value === 'artist' || value === 'album' ? value : undefined,
              });
            }}
          >
            <option value="">Todos los tipos</option>
            <option value="artist">Artistas</option>
            <option value="album">Álbumes</option>
          </select>

          <select
            className={styles.filterSelect}
            value={filters.status || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange({
                status:
                  value === 'success' || value === 'partial' || value === 'error'
                    ? value
                    : undefined,
              });
            }}
          >
            <option value="">Todos los estados</option>
            <option value="success">Éxito</option>
            <option value="partial">Parcial</option>
            <option value="error">Error</option>
          </select>

          <select
            className={styles.filterSelect}
            value={filters.provider || ''}
            onChange={(e) => handleFilterChange({ provider: e.target.value || undefined })}
          >
            <option value="">Todos los proveedores</option>
            <option value="lastfm">Last.fm</option>
            <option value="fanart">Fanart.tv</option>
            <option value="musicbrainz">MusicBrainz</option>
          </select>
        </div>

        {/* Table */}
        {logsLoading ? (
          <div className={styles.loading}>Cargando historial...</div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <Clock size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>No hay registros de enriquecimiento</p>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Entidad</th>
                    <th>Proveedor</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={log.previewUrl ? styles.clickableRow : ''}
                      onClick={() => {
                        const imageUrl = buildImageUrl(log);
                        if (imageUrl) setPreviewImage(imageUrl);
                      }}
                      title={log.previewUrl ? 'Clic para ver imagen' : ''}
                    >
                      <td>{formatDateCompact(log.createdAt)}</td>
                      <td>
                        <div className={styles.entityCell}>
                          {getEntityIcon(log.entityType)}
                          <span>{log.entityName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.providerBadge}>{log.provider}</span>
                      </td>
                      <td>{log.metadataType}</td>
                      <td>{getStatusBadge(log.status)}</td>
                      <td>{log.processingTime ? `${log.processingTime}ms` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <div className={styles.paginationInfo}>
                  Mostrando {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, total)} de {total}
                </div>

                <div className={styles.paginationControls}>
                  <button
                    className={styles.paginationButton}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>

                  <div className={styles.paginationPages}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          className={`${styles.paginationButton} ${currentPage === pageNum ? styles.paginationButtonActive : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className={styles.paginationButton}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className={styles.imageModal} onClick={() => setPreviewImage(null)}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.imageModalClose} onClick={() => setPreviewImage(null)}>
              ×
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className={styles.imageModalImage}
              onError={(e) => {
                e.currentTarget.src = '/placeholder-album.png';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
