/**
 * History Tab Component (Refactored)
 *
 * Container for enrichment history with clean architecture
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, Trash2, Settings, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEnrichmentLogs, useEnrichmentStats, useEnrichmentBackfill } from '../../../hooks/useEnrichmentHistory';
import { enrichmentApi, ListEnrichmentLogsFilters } from '../../../api/enrichment.api';
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

  // Retention & cleanup state
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const queryClient = useQueryClient();

  // Queries
  const { data: logsData, isLoading: logsLoading } = useEnrichmentLogs(filters);
  const { data: statsData, isLoading: statsLoading } = useEnrichmentStats(statsPeriod);

  // Auto-backfill if artist/album logs are missing
  useEnrichmentBackfill(statsData);

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const pageSize = filters.take || 10;
  const totalPages = Math.ceil(total / pageSize);

  // Load retention setting
  useEffect(() => {
    enrichmentApi.getRetention()
      .then((res) => setRetentionDays(res.retentionDays))
      .catch(() => {});
  }, []);

  // Cleanup timer on unmount
  useEffect(
    () => () => { clearTimeout(cleanupTimerRef.current); },
    [],
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['enrichmentLogs'] });
    queryClient.invalidateQueries({ queryKey: ['enrichmentStats'] });
  };

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

  const handleRetentionChange = async (days: number) => {
    setRetentionDays(days);
    setIsSavingRetention(true);
    try {
      await enrichmentApi.saveRetention(days);
    } catch {
      // silently fail
    } finally {
      setIsSavingRetention(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    try {
      const res = await enrichmentApi.cleanupOldLogs();
      const count = res.deletedCount;
      setCleanupResult(
        count > 0 ? `${count} logs eliminados` : 'No hay logs antiguos para eliminar',
      );
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(() => setCleanupResult(null), 5000);
      if (count > 0) invalidateAll();
    } catch {
      // silently fail
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDeleteAll = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setCleanupResult(null);
    try {
      const res = await enrichmentApi.deleteAllLogs();
      const count = res.deletedCount;
      setCleanupResult(
        count > 0 ? `${count} logs eliminados (todos)` : 'No hay logs para eliminar',
      );
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(() => setCleanupResult(null), 5000);
      invalidateAll();
    } catch {
      // silently fail
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Statistics Section - Always show when data available (keeps previous data during refetch) */}
      {statsData && (
        <div style={{ opacity: statsLoading ? 0.7 : 1, transition: 'opacity 0.2s ease' }}>
          <StatsSection stats={statsData} period={statsPeriod} onPeriodChange={setStatsPeriod} />
          <ProviderStatsGrid providers={statsData.byProvider} />
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
        </div>

        {/* Retention & Cleanup Bar */}
        <div className={styles.retentionBar}>
          <div className={styles.retentionLeft}>
            <Settings size={14} />
            <span className={styles.retentionLabel}>Retención:</span>
            <select
              value={retentionDays}
              onChange={(e) => handleRetentionChange(Number(e.target.value))}
              className={styles.retentionSelect}
              disabled={isSavingRetention}
            >
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
            {isSavingRetention && <span className={styles.savingIndicator}>Guardando...</span>}
          </div>
          <div className={styles.retentionRight}>
            {cleanupResult && (
              <span className={styles.cleanupResult}>
                <Check size={14} />
                {cleanupResult}
              </span>
            )}
            <button
              className={styles.cleanupButton}
              onClick={handleCleanup}
              disabled={isCleaningUp || isDeleting}
            >
              <Trash2 size={14} />
              {isCleaningUp ? 'Limpiando...' : 'Limpiar antiguos'}
            </button>
            {!showDeleteConfirm ? (
              <button
                className={styles.deleteAllButton}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isCleaningUp || isDeleting}
              >
                <Trash2 size={14} />
                {isDeleting ? 'Eliminando...' : 'Eliminar todos'}
              </button>
            ) : (
              <div className={styles.deleteConfirm}>
                <span className={styles.deleteConfirmText}>¿Seguro?</span>
                <button className={styles.deleteConfirmYes} onClick={handleDeleteAll}>
                  Sí, eliminar
                </button>
                <button className={styles.deleteConfirmNo} onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
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
