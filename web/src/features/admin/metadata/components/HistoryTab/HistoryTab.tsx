/**
 * History Tab Component (Refactored)
 *
 * Container for enrichment history with clean architecture
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Trash2, Settings, Check } from 'lucide-react';
import {
  useEnrichmentLogs,
  useEnrichmentStats,
  useEnrichmentBackfill,
} from '../../../hooks/useEnrichmentHistory';
import { useRetentionCleanup } from '../../hooks/useRetentionCleanup';
import type { ListEnrichmentLogsFilters } from '../../../api/enrichment.service';
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
  const { t } = useTranslation();
  // Filters and pagination
  const [filters, setFilters] = useState<ListEnrichmentLogsFilters>({
    skip: 0,
    take: 10,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Retention & cleanup (extracted hook)
  const {
    retentionDays,
    isSavingRetention,
    isCleaningUp,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    cleanupResult,
    handleRetentionChange,
    handleCleanup,
    handleDeleteAll,
  } = useRetentionCleanup();

  // Queries
  const { data: logsData, isLoading: logsLoading } = useEnrichmentLogs(filters);
  const { data: statsData, isLoading: statsLoading } = useEnrichmentStats(statsPeriod);

  // Auto-backfill if artist/album logs are missing
  useEnrichmentBackfill(statsData);

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
            <h3 className={styles.historyTitle}>{t('admin.metadata.historyTab.title')}</h3>
            <p className={styles.historyDescription}>
              {total > 0
                ? t('admin.metadata.historyTab.totalRecords', { count: total })
                : t('admin.metadata.historyTab.noRecords')}
            </p>
          </div>
        </div>

        {/* Retention & Cleanup Bar */}
        <div className={styles.retentionBar}>
          <div className={styles.retentionLeft}>
            <Settings size={14} />
            <span className={styles.retentionLabel}>
              {t('admin.metadata.historyTab.retention')}
            </span>
            <select
              value={retentionDays}
              onChange={(e) => handleRetentionChange(Number(e.target.value))}
              className={styles.retentionSelect}
              disabled={isSavingRetention}
            >
              <option value={7}>{t('admin.metadata.historyTab.days', { count: 7 })}</option>
              <option value={14}>{t('admin.metadata.historyTab.days', { count: 14 })}</option>
              <option value={30}>{t('admin.metadata.historyTab.days', { count: 30 })}</option>
              <option value={60}>{t('admin.metadata.historyTab.days', { count: 60 })}</option>
              <option value={90}>{t('admin.metadata.historyTab.days', { count: 90 })}</option>
            </select>
            {isSavingRetention && (
              <span className={styles.savingIndicator}>
                {t('admin.metadata.historyTab.saving')}
              </span>
            )}
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
              {isCleaningUp
                ? t('admin.metadata.historyTab.cleaning')
                : t('admin.metadata.historyTab.cleanOld')}
            </button>
            {!showDeleteConfirm ? (
              <button
                className={styles.deleteAllButton}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isCleaningUp || isDeleting}
              >
                <Trash2 size={14} />
                {isDeleting
                  ? t('admin.metadata.historyTab.deleting')
                  : t('admin.metadata.historyTab.deleteAll')}
              </button>
            ) : (
              <div className={styles.deleteConfirm}>
                <span className={styles.deleteConfirmText}>
                  {t('admin.metadata.historyTab.deleteConfirm')}
                </span>
                <button className={styles.deleteConfirmYes} onClick={handleDeleteAll}>
                  {t('admin.metadata.historyTab.yesDelete')}
                </button>
                <button
                  className={styles.deleteConfirmNo}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t('common.cancel')}
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
          <div className={styles.loading}>{t('admin.metadata.historyTab.loadingHistory')}</div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <Clock size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>{t('admin.metadata.historyTab.noEnrichmentRecords')}</p>
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
