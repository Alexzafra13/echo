import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, AlertTriangle, Info, Bug, XCircle, Filter, Calendar } from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import { formatDateWithTime } from '@shared/utils/format';
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

const LEVEL_CONFIG = {
  critical: { icon: XCircle, color: '#ef4444', label: 'CRÍTICO' },
  error: { icon: AlertCircle, color: '#f97316', label: 'ERROR' },
  warning: { icon: AlertTriangle, color: '#eab308', label: 'ADVERTENCIA' },
  info: { icon: Info, color: '#3b82f6', label: 'INFO' },
  debug: { icon: Bug, color: '#6b7280', label: 'DEBUG' },
};

/**
 * LogsPanel Component
 * Muestra los logs del sistema con filtros y paginación
 */
export function LogsPanel() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar logs al montar
  useEffect(() => {
    loadLogs();
  }, [selectedLevel, selectedCategory, offset]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        limit,
        offset,
      };

      if (selectedLevel !== 'all') {
        params.level = selectedLevel;
      }

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
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
    return <Icon size={20} style={{ color: config.color }} />;
  };

  if (isLoading && logs.length === 0) {
    return <div className={styles.loading}>Cargando logs...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Logs del Sistema</h2>
        <Button onClick={loadLogs} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          Actualizar
        </Button>
      </div>

      {/* Error notification */}
      {error && (
        <InlineNotification
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <label>Nivel:</label>
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value);
              setOffset(0);
            }}
            className={styles.select}
          >
            <option value="all">Todos</option>
            <option value="critical">Crítico</option>
            <option value="error">Error</option>
            <option value="warning">Advertencia</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Categoría:</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setOffset(0);
            }}
            className={styles.select}
          >
            <option value="all">Todas</option>
            <option value="scanner">Scanner</option>
            <option value="metadata">Metadata</option>
            <option value="auth">Auth</option>
            <option value="api">API</option>
            <option value="storage">Storage</option>
            <option value="cleanup">Cleanup</option>
          </select>
        </div>

        <div className={styles.stats}>
          Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} logs
        </div>
      </div>

      {/* Lista de Logs */}
      <div className={styles.logsList}>
        {logs.length === 0 ? (
          <div className={styles.empty}>
            <Info size={48} />
            <p>No hay logs que mostrar</p>
            <p className={styles.emptyHint}>
              Solo se muestran logs de nivel WARNING, ERROR y CRITICAL.
              <br />
              Los logs INFO y DEBUG solo aparecen en la consola del servidor.
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

                <div className={styles.logCategory}>[{log.category.toUpperCase()}]</div>

                <div className={styles.logTime}>
                  <Calendar size={14} />
                  {formatDateWithTime(log.createdAt)}
                </div>
              </div>

              <div className={styles.logMessage}>{log.message}</div>

              {expandedLog === log.id && (
                <div className={styles.logDetails}>
                  {log.entityId && (
                    <div className={styles.detailRow}>
                      <strong>Entity ID:</strong> {log.entityId}
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

      {/* Paginación */}
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
