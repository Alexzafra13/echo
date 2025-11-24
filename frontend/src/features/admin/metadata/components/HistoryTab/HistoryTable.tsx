/**
 * History Table Component
 *
 * Table displaying enrichment log entries
 */

import { formatDate, getStatusBadge, getEntityIcon, buildImageUrl } from './historyUtils';
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
