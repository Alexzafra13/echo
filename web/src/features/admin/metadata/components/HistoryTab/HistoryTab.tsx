/**
 * History Tab Component (Refactored)
 *
 * Container for enrichment history with clean architecture
 */

import { useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useEnrichmentLogs, useEnrichmentStats } from '../../../hooks/useEnrichmentHistory';
import { ListEnrichmentLogsFilters } from '../../../api/enrichment.api';
import { StatsSection } from './StatsSection';
import { ProviderStatsGrid } from './ProviderStatsGrid';
import { HistoryFilters } from './HistoryFilters';
import { HistoryTable } from './HistoryTable';
import { Pagination } from './Pagination';
import { ImagePreviewModal } from './ImagePreviewModal';
import styles from './HistoryTab.module.css';

/**
 * Enrichment history tab
 */
export function HistoryTab() {
  // Filters and pagination
  const [filters, setFilters] = useState<ListEnrichmentLogsFilters>({
    skip: 0,
    take: 10,
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
  const pageSize = filters.take || 10;
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

  return (
    <div className={styles.container}>
      {/* Statistics Section */}
      {!statsLoading && statsData && (
        <>
          <StatsSection
            stats={statsData}
            period={statsPeriod}
            onPeriodChange={setStatsPeriod}
          />
          <ProviderStatsGrid providers={statsData.byProvider} />
        </>
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
            onClick={() => refetchLogs()}
            loading={logsLoading}
            leftIcon={<RefreshCw size={16} />}
          >
            Actualizar
          </Button>
        </div>

        {/* Filters */}
        <HistoryFilters
          entityType={filters.entityType}
          status={filters.status}
          provider={filters.provider}
          onEntityTypeChange={(entityType) => handleFilterChange({ entityType })}
          onStatusChange={(status) => handleFilterChange({ status })}
          onProviderChange={(provider) => handleFilterChange({ provider })}
        />

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
            <HistoryTable logs={logs} onRowClick={setPreviewImage} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
