import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  XCircle,
  Filter,
  Calendar,
  ChevronDown,
  Search,
  Database,
  Shield,
  Globe,
  HardDrive,
  Trash2,
  FileText,
  Check,
  Settings,
} from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import { formatDateWithTime } from '@shared/utils/format';
import { useLogs, useLogMaintenance, useCopyToClipboard } from '../../hooks/useLogs';
import type { SystemLog } from '../../hooks/useLogs';
import { CopyableDetail } from './CopyableDetail';
import styles from './LogsPanel.module.css';

const LEVEL_CONFIG = {
  critical: {
    icon: XCircle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
  error: {
    icon: AlertCircle,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
  },
  warning: {
    icon: AlertTriangle,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
  },
  info: { icon: Info, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  debug: { icon: Bug, color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  scanner: { icon: Search, color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.15)' },
  metadata: { icon: Database, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)' },
  auth: { icon: Shield, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  api: { icon: Globe, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  storage: { icon: HardDrive, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  cleanup: { icon: Trash2, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
};

function formatDetails(details: string | null) {
  if (!details) return null;
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return details;
  }
}

/**
 * LogsPanel Component
 * Muestra los logs del sistema con filtros y paginación
 */
export function LogsPanel() {
  const { t } = useTranslation();
  const {
    logs,
    isLoading,
    total,
    selectedLevel,
    selectedCategory,
    limit,
    offset,
    setOffset,
    error: logsError,
    setError: setLogsError,
    changeLevel,
    changeCategory,
    reloadLogs,
  } = useLogs();

  const maintenance = useLogMaintenance(reloadLogs);
  const { copiedField, handleCopy } = useCopyToClipboard();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const error = logsError || maintenance.error;

  const toggleLogDetails = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const renderLogIcon = (level: SystemLog['level']) => {
    const config = LEVEL_CONFIG[level];
    const Icon = config.icon;
    return <Icon size={18} style={{ color: config.color }} />;
  };

  const renderCategoryBadge = (category: string) => {
    const config = CATEGORY_CONFIG[category.toLowerCase()];
    if (config) {
      const Icon = config.icon;
      return (
        <div
          className={styles.categoryBadge}
          style={{
            background: config.bgColor,
            borderColor: config.color,
          }}
        >
          <Icon size={12} />
          <span style={{ color: config.color }}>{category.toUpperCase()}</span>
        </div>
      );
    }
    return (
      <div className={styles.categoryBadge}>
        <FileText size={12} />
        <span>{category.toUpperCase()}</span>
      </div>
    );
  };

  if (isLoading && logs.length === 0) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{t('admin.logs.title')}</h2>
      </div>

      {/* Retention & Cleanup */}
      <div className={styles.retentionBar}>
        <div className={styles.retentionLeft}>
          <Settings size={16} />
          <span className={styles.retentionLabel}>{t('admin.logs.retention')}:</span>
          <select
            value={maintenance.retentionDays}
            onChange={(e) => maintenance.handleRetentionChange(Number(e.target.value))}
            className={styles.retentionSelect}
            disabled={maintenance.isSavingRetention}
          >
            <option value={7}>{t('admin.logs.retentionDays', { count: 7 })}</option>
            <option value={14}>{t('admin.logs.retentionDays', { count: 14 })}</option>
            <option value={30}>{t('admin.logs.retentionDays', { count: 30 })}</option>
            <option value={60}>{t('admin.logs.retentionDays', { count: 60 })}</option>
            <option value={90}>{t('admin.logs.retentionDays', { count: 90 })}</option>
          </select>
          {maintenance.isSavingRetention && (
            <span className={styles.savingIndicator}>{t('common.saving')}</span>
          )}
        </div>
        <div className={styles.retentionRight}>
          {maintenance.cleanupResult && (
            <span className={styles.cleanupResult}>
              <Check size={14} />
              {maintenance.cleanupResult.count > 0
                ? maintenance.cleanupResult.type === 'deleteAll'
                  ? t('admin.logs.logsDeletedNew', { count: maintenance.cleanupResult.count })
                  : t('admin.logs.logsDeleted', { count: maintenance.cleanupResult.count })
                : maintenance.cleanupResult.type === 'deleteAll'
                  ? t('admin.logs.noLogsToDelete')
                  : t('admin.logs.noOldLogs')}
            </span>
          )}
          <Button
            onClick={maintenance.handleCleanup}
            disabled={maintenance.isCleaningUp || maintenance.isDeletingAll}
            variant="ghost"
            size="sm"
          >
            <Trash2 size={14} className={maintenance.isCleaningUp ? styles.spinning : ''} />
            {maintenance.isCleaningUp ? t('admin.logs.cleaning') : t('admin.logs.cleanOld')}
          </Button>
          {!maintenance.showDeleteConfirm ? (
            <Button
              onClick={() => maintenance.setShowDeleteConfirm(true)}
              disabled={maintenance.isCleaningUp || maintenance.isDeletingAll}
              variant="ghost"
              size="sm"
              className={styles.dangerButton}
            >
              <Trash2 size={14} className={maintenance.isDeletingAll ? styles.spinning : ''} />
              {maintenance.isDeletingAll ? t('common.deleting') : t('admin.logs.deleteAll')}
            </Button>
          ) : (
            <div className={styles.deleteConfirm}>
              <span className={styles.deleteConfirmText}>{t('admin.logs.deleteConfirm')}</span>
              <Button
                onClick={maintenance.handleDeleteAll}
                variant="ghost"
                size="sm"
                className={styles.dangerButton}
              >
                {t('admin.logs.yesDelete')}
              </Button>
              <Button
                onClick={() => maintenance.setShowDeleteConfirm(false)}
                variant="ghost"
                size="sm"
              >
                {t('common.cancel')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <InlineNotification
          type="error"
          message={error}
          onDismiss={() => setLogsError(null)}
          autoHideMs={5000}
        />
      )}

      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <label>{t('admin.logs.levelLabel')}:</label>
          <select
            value={selectedLevel}
            onChange={(e) => changeLevel(e.target.value)}
            className={styles.select}
          >
            <option value="all">{t('admin.logs.levels.all')}</option>
            <option value="critical">{t('admin.logs.levels.critical')}</option>
            <option value="error">{t('admin.logs.levels.error')}</option>
            <option value="warning">{t('admin.logs.levels.warning')}</option>
            <option value="info">{t('admin.logs.levels.info')}</option>
            <option value="debug">{t('admin.logs.levels.debug')}</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>{t('admin.logs.categoryLabel')}:</label>
          <select
            value={selectedCategory}
            onChange={(e) => changeCategory(e.target.value)}
            className={styles.select}
          >
            <option value="all">{t('admin.logs.categories.all')}</option>
            <option value="scanner">{t('admin.logs.categories.scanner')}</option>
            <option value="metadata">{t('admin.logs.categories.metadata')}</option>
            <option value="auth">{t('admin.logs.categories.auth')}</option>
            <option value="api">{t('admin.logs.categories.service')}</option>
            <option value="storage">{t('admin.logs.categories.storage')}</option>
            <option value="cleanup">{t('admin.logs.categories.cleanup')}</option>
          </select>
        </div>

        <div className={styles.stats}>
          {t('common.showing', { from: offset + 1, to: Math.min(offset + limit, total), total })}{' '}
          logs
        </div>
      </div>

      {/* Lista de Logs */}
      <div className={styles.logsList}>
        {logs.length === 0 ? (
          <div className={styles.empty}>
            <Info size={48} />
            <p>{t('admin.logs.noLogs')}</p>
            <p className={styles.emptyHint}>{t('admin.logs.noLogsHint')}</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`${styles.logCard} ${styles[`level-${log.level}`]} ${expandedLog === log.id ? styles.logCardExpanded : ''}`}
            >
              <div className={styles.logHeader} onClick={() => toggleLogDetails(log.id)}>
                <div
                  className={styles.levelBadge}
                  style={{
                    background: LEVEL_CONFIG[log.level].bgColor,
                    borderColor: LEVEL_CONFIG[log.level].color,
                  }}
                >
                  {renderLogIcon(log.level)}
                  <span style={{ color: LEVEL_CONFIG[log.level].color }}>
                    {t(`admin.logs.levelLabels.${log.level}`)}
                  </span>
                </div>

                {renderCategoryBadge(log.category)}

                <div className={styles.logTime}>
                  <Calendar size={14} />
                  {formatDateWithTime(log.createdAt)}
                </div>

                <div
                  className={`${styles.expandIndicator} ${expandedLog === log.id ? styles.expandIndicatorOpen : ''}`}
                >
                  <ChevronDown size={18} />
                </div>
              </div>

              <div className={styles.logMessage} onClick={() => toggleLogDetails(log.id)}>
                {log.message}
              </div>

              {expandedLog === log.id && (
                <div className={styles.logDetails} onClick={(e) => e.stopPropagation()}>
                  {log.entityId && (
                    <CopyableDetail
                      label="Entity ID"
                      value={log.entityType ? `${log.entityId} (${log.entityType})` : log.entityId!}
                      copiedField={copiedField}
                      fieldId={`entity-${log.id}`}
                      onCopy={handleCopy}
                    >
                      <span className={styles.detailValue}>
                        {log.entityId}
                        {log.entityType && (
                          <span className={styles.entityType}>{log.entityType}</span>
                        )}
                      </span>
                    </CopyableDetail>
                  )}

                  {log.details && (
                    <CopyableDetail
                      label={t('admin.logs.details')}
                      value={formatDetails(log.details) || ''}
                      copiedField={copiedField}
                      fieldId={`details-${log.id}`}
                      onCopy={handleCopy}
                    >
                      <pre className={styles.detailsJson}>{formatDetails(log.details)}</pre>
                    </CopyableDetail>
                  )}

                  {log.stackTrace && (
                    <CopyableDetail
                      label={t('admin.logs.stackTrace')}
                      value={log.stackTrace}
                      copiedField={copiedField}
                      fieldId={`stack-${log.id}`}
                      onCopy={handleCopy}
                    >
                      <pre className={styles.stackTrace}>{log.stackTrace}</pre>
                    </CopyableDetail>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {total > limit && (
        <div className={styles.pagination}>
          <Button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>
            ← {t('common.previous')}
          </Button>

          <span>
            {t('common.showing', {
              from: Math.floor(offset / limit) + 1,
              to: Math.ceil(total / limit),
              total,
            })}
          </span>

          <Button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}>
            {t('common.next')} →
          </Button>
        </div>
      )}
    </div>
  );
}
