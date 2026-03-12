/**
 * History Table Component
 *
 * Table displaying enrichment log entries
 * Uses card layout on mobile for better responsive behavior
 */

import { formatDate, getStatusBadge, buildImageUrl } from './historyUtils';
import styles from './HistoryTab.module.css';

export interface EnrichmentLog {
  id: string;
  createdAt: string;
  entityType: string;
  entityName: string;
  entityId?: string;
  provider: string;
  metadataType: string;
  status: string;
  processingTime?: number;
  previewUrl?: string;
}

export interface HistoryTableProps {
  logs: EnrichmentLog[];
  onRowClick: (imageUrl: string) => void;
}

/**
 * Table displaying enrichment logs
 */
export function HistoryTable({ logs, onRowClick }: HistoryTableProps) {
  return (
    <>
      {/* Desktop table */}
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
            {logs.map((log) => {
              const imageUrl = buildImageUrl(log);
              return (
                <tr
                  key={log.id}
                  className={imageUrl ? styles.clickableRow : ''}
                  onClick={() => {
                    if (imageUrl) onRowClick(imageUrl);
                  }}
                  title={imageUrl ? 'Clic para ver imagen' : ''}
                >
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    <span>{log.entityName}</span>
                  </td>
                  <td>
                    <span className={styles.providerBadge}>{log.provider}</span>
                  </td>
                  <td>{log.metadataType}</td>
                  <td>{getStatusBadge(log.status)}</td>
                  <td>{log.processingTime ? `${log.processingTime}ms` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className={styles.cardList}>
        {logs.map((log) => {
          const imageUrl = buildImageUrl(log);
          return (
            <div
              key={log.id}
              className={`${styles.card} ${imageUrl ? styles.clickableRow : ''}`}
              onClick={() => {
                if (imageUrl) onRowClick(imageUrl);
              }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardEntity}>{log.entityName}</span>
                {getStatusBadge(log.status)}
              </div>
              <div className={styles.cardDetails}>
                <span className={styles.providerBadge}>{log.provider}</span>
                <span className={styles.cardMeta}>{log.metadataType}</span>
                <span className={styles.cardDate}>{formatDate(log.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
