import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, AlertTriangle, Info, Bug, XCircle, Filter, Database, Clock } from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import styles from './LogsPanel.module.css';

interface SystemLog {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  category: string;
  message: string;
  details: string | null;
  userId: string | null;
  entityId: string | null;
  entityType: string | null;
  stackTrace: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: SystemLog[];
  total: number;
  limit: number;
  offset: number;
}

interface LogsStats {
  totalLogs: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
}

interface StorageInfo {
  totalRows: number;
  estimatedSizeMB: number;
}

const LEVEL_CONFIG = {
  critical: { icon: XCircle, color: '#ef4444', label: 'CRÍTICO' },
  error: { icon: AlertCircle, color: '#f97316', label: 'ERROR' },
  warning: { icon: AlertTriangle, color: '#eab308', label: 'ADVERTENCIA' },
  info: { icon: Info, color: '#3b82f6', label: 'INFO' },
  debug: { icon: Bug, color: '#6b7280', label: 'DEBUG' },
};

// Date range presets
const DATE_RANGES = [
  { value: 'all', label: 'Todo el tiempo' },
  { value: '1h', label: 'Última hora' },
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
];

/**
 * Get relative time string
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'hace unos segundos';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} sem`;
  return `hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
}

/**
 * Get date from range preset
 */
function getStartDateFromRange(range: string): Date | undefined {
  if (range === 'all') return undefined;

  const now = new Date();
  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}

/**
 * LogsPanel Component
 * Muestra los logs del sistema con filtros, estadísticas y paginación
 */
export function LogsPanel() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('24h');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load stats and storage on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Load logs when filters change
  useEffect(() => {
    loadLogs();
  }, [selectedLevel, selectedCategory, selectedDateRange, offset]);

  const loadStats = async () => {
    try {
      const [statsRes, storageRes] = await Promise.all([
        apiClient.get<LogsStats>('/logs/stats'),
        apiClient.get<StorageInfo>('/logs/storage'),
      ]);
      setStats(statsRes.data);
      setStorage(storageRes.data);
    } catch (err) {
      // Stats are optional, don't show error
      if (import.meta.env.DEV) {
        console.error('Error loading stats:', err);
      }
    }
  };

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: Record<string, string | number> = {
        limit,
        offset,
      };

      if (selectedLevel !== 'all') {
        params.level = selectedLevel;
      }

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const startDate = getStartDateFromRange(selectedDateRange);
      if (startDate) {
        params.startDate = startDate.toISOString();
      }

      const response = await apiClient.get<LogsResponse>('/logs', { params });
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Error loading logs:', err);
      }
      setError('Error al cargar logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
    loadLogs();
  };

  const toggleLogDetails = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const formatDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  };

  const renderLogIcon = (level: SystemLog['level']) => {
    const config = LEVEL_CONFIG[level];
    const Icon = config.icon;
    return <Icon size={18} style={{ color: config.color }} />;
  };

  // Calculate summary from stats
  const summary = useMemo(() => {
    if (!stats) return null;
    return {
      critical: stats.byLevel['critical'] || 0,
      error: stats.byLevel['error'] || 0,
      warning: stats.byLevel['warning'] || 0,
    };
  }, [stats]);

  if (isLoading && logs.length === 0) {
    return <div className={styles.loading}>Cargando logs...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header with stats */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Logs del Sistema</h2>
          {storage && (
            <div className={styles.storageInfo}>
              <Database size={14} />
              <span>{storage.totalRows.toLocaleString()} logs</span>
              <span className={styles.storageDot}>•</span>
              <span>{storage.estimatedSizeMB} MB</span>
            </div>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          Actualizar
        </Button>
      </div>

      {/* Stats summary */}
      {summary && (summary.critical > 0 || summary.error > 0 || summary.warning > 0) && (
        <div className={styles.statsSummary}>
          {summary.critical > 0 && (
            <div className={`${styles.statBadge} ${styles.statCritical}`}>
              <XCircle size={14} />
              <span>{summary.critical} críticos</span>
            </div>
          )}
          {summary.error > 0 && (
            <div className={`${styles.statBadge} ${styles.statError}`}>
              <AlertCircle size={14} />
              <span>{summary.error} errores</span>
            </div>
          )}
          {summary.warning > 0 && (
            <div className={`${styles.statBadge} ${styles.statWarning}`}>
              <AlertTriangle size={14} />
              <span>{summary.warning} advertencias</span>
            </div>
          )}
        </div>
      )}

      {/* Error notification */}
      {error && (
        <InlineNotification
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value);
              setOffset(0);
            }}
            className={styles.select}
          >
            <option value="all">Todos los niveles</option>
            <option value="critical">Crítico</option>
            <option value="error">Error</option>
            <option value="warning">Advertencia</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setOffset(0);
            }}
            className={styles.select}
          >
            <option value="all">Todas las categorías</option>
            <option value="scanner">Scanner</option>
            <option value="metadata">Metadata</option>
            <option value="auth">Auth</option>
            <option value="api">API</option>
            <option value="storage">Storage</option>
            <option value="cleanup">Cleanup</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <Clock size={16} />
          <select
            value={selectedDateRange}
            onChange={(e) => {
              setSelectedDateRange(e.target.value);
              setOffset(0);
            }}
            className={styles.select}
          >
            {DATE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.stats}>
          {offset + 1}-{Math.min(offset + limit, total)} de {total}
        </div>
      </div>

      {/* Logs List */}
      <div className={styles.logsList}>
        {logs.length === 0 ? (
          <div className={styles.empty}>
            <Info size={48} />
            <p>No hay logs que mostrar</p>
            <p className={styles.emptyHint}>
              Solo se guardan logs de nivel WARNING, ERROR y CRITICAL.
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`${styles.logCard} ${styles[`level-${log.level}`]}`}
              onClick={() => toggleLogDetails(log.id)}
            >
              <div className={styles.logHeader}>
                <div className={styles.logLevel}>
                  {renderLogIcon(log.level)}
                  <span className={styles.levelLabel}>{LEVEL_CONFIG[log.level].label}</span>
                </div>

                <div className={styles.logCategory}>{log.category}</div>

                <div className={styles.logTime} title={new Date(log.createdAt).toLocaleString()}>
                  {getRelativeTime(log.createdAt)}
                </div>
              </div>

              <div className={styles.logMessage}>{log.message}</div>

              {expandedLog === log.id && (
                <div className={styles.logDetails}>
                  {log.entityId && (
                    <div className={styles.detailRow}>
                      <strong>Entity:</strong> {log.entityId}
                      {log.entityType && ` (${log.entityType})`}
                    </div>
                  )}

                  {log.details && (
                    <div className={styles.detailRow}>
                      <strong>Detalles:</strong>
                      <pre className={styles.detailsJson}>{formatDetails(log.details)}</pre>
                    </div>
                  )}

                  {log.stackTrace && (
                    <div className={styles.detailRow}>
                      <strong>Stack Trace:</strong>
                      <pre className={styles.stackTrace}>{log.stackTrace}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className={styles.pagination}>
          <Button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
          >
            ← Anterior
          </Button>

          <span>
            Página {Math.floor(offset / limit) + 1} de {Math.ceil(total / limit)}
          </span>

          <Button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
          >
            Siguiente →
          </Button>
        </div>
      )}
    </div>
  );
}
