/**
 * History Table Component
 *
 * Table displaying enrichment log entries
 */

import { formatDate, getStatusBadge, getEntityIcon, buildImageUrl } from './historyUtils';
import { getProviderBranding } from '../../constants/providerBranding';
import styles from './HistoryTab.module.css';

/** Map display names to branding keys */
const PROVIDER_KEY_MAP: Record<string, string> = {
  'last.fm': 'lastfm',
  'lastfm': 'lastfm',
  'fanart.tv': 'fanart',
  'fanart': 'fanart',
  'musicbrainz': 'musicbrainz',
  'cover art archive': 'coverartarchive',
  'coverartarchive': 'coverartarchive',
  'coverart': 'coverartarchive',
  'wikipedia': 'wikipedia',
};

function getProviderLogo(name: string) {
  const key = PROVIDER_KEY_MAP[name.toLowerCase()] || name.toLowerCase();
  return getProviderBranding(key);
}

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
                  {(() => {
                    const branding = getProviderLogo(log.provider);
                    if (branding) {
                      return (
                        <img
                          src={branding.logoPath}
                          alt={branding.name}
                          className={styles.providerTableLogo}
                          style={branding.statsLogoHeight ? { height: branding.statsLogoHeight } : undefined}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = '';
                          }}
                        />
                      );
                    }
                    return null;
                  })()}
                  <span
                    className={styles.providerBadge}
                    style={getProviderLogo(log.provider) ? { display: 'none' } : undefined}
                  >
                    {log.provider}
                  </span>
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
