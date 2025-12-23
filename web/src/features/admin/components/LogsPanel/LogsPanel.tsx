import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RefreshCw, AlertCircle, AlertTriangle, Info, Bug, XCircle, Filter, Calendar, ChevronDown, Search, Database, Shield, Globe, HardDrive, Trash2, FileText } from 'lucide-react';
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
  critical: { icon: XCircle, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', label: 'CRÍTICO' },
  error: { icon: AlertCircle, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)', label: 'ERROR' },
  warning: { icon: AlertTriangle, color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)', label: 'ADVERTENCIA' },
  info: { icon: Info, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', label: 'INFO' },
  debug: { icon: Bug, color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', label: 'DEBUG' },
};

const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  scanner: { icon: Search, color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.15)' },
  metadata: { icon: Database, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)' },
  auth: { icon: Shield, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  api: { icon: Globe, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  storage: { icon: HardDrive, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  cleanup: { icon: Trash2, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
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
            borderColor: config.color
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
              className={`${styles.logCard} ${styles[`level-${log.level}`]} ${expandedLog === log.id ? styles.logCardExpanded : ''}`}
              onClick={() => toggleLogDetails(log.id)}
            >
              <div className={styles.logHeader}>
                <div
                  className={styles.levelBadge}
                  style={{
                    background: LEVEL_CONFIG[log.level].bgColor,
                    borderColor: LEVEL_CONFIG[log.level].color
                  }}
                >
                  {renderLogIcon(log.level)}
                  <span style={{ color: LEVEL_CONFIG[log.level].color }}>{LEVEL_CONFIG[log.level].label}</span>
                </div>

                {renderCategoryBadge(log.category)}

                <div className={styles.logTime}>
                  <Calendar size={14} />
                  {formatDateWithTime(log.createdAt)}
                </div>

                <div className={`${styles.expandIndicator} ${expandedLog === log.id ? styles.expandIndicatorOpen : ''}`}>
                  <ChevronDown size={18} />
                </div>
              </div>

              <div className={styles.logMessage}>{log.message}</div>

              {expandedLog === log.id && (
                <div className={styles.logDetails}>
                  {log.entityId && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Entity ID</span>
                      <span className={styles.detailValue}>
                        {log.entityId}
                        {log.entityType && <span className={styles.entityType}>{log.entityType}</span>}
                      </span>
                    </div>
                  )}

                  {log.details && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Detalles</span>
                      <pre className={styles.detailsJson}>{formatDetails(log.details)}</pre>
                    </div>
                  )}

                  {log.stackTrace && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Stack Trace</span>
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
