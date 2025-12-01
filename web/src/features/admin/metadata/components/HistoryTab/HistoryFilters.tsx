/**
 * History Filters Component
 *
 * Filter dropdowns for enrichment history
 */

import styles from './HistoryTab.module.css';

export interface HistoryFiltersProps {
  entityType?: 'artist' | 'album';
  status?: 'success' | 'partial' | 'error';
  provider?: string;
  onEntityTypeChange: (entityType: 'artist' | 'album' | undefined) => void;
  onStatusChange: (status: 'success' | 'partial' | 'error' | undefined) => void;
  onProviderChange: (provider: string | undefined) => void;
}

/**
 * Filter dropdowns for history
 */
export function HistoryFilters({
  entityType,
  status,
  provider,
  onEntityTypeChange,
  onStatusChange,
  onProviderChange,
}: HistoryFiltersProps) {
  return (
    <div className={styles.filters}>
      <select
        className={styles.filterSelect}
        value={entityType || ''}
        onChange={(e) => {
          const value = e.target.value;
          onEntityTypeChange(value ? (value as 'artist' | 'album') : undefined);
        }}
      >
        <option value="">Todos los tipos</option>
        <option value="artist">Artistas</option>
        <option value="album">Álbumes</option>
      </select>

      <select
        className={styles.filterSelect}
        value={status || ''}
        onChange={(e) => {
          const value = e.target.value;
          onStatusChange(value ? (value as 'success' | 'partial' | 'error') : undefined);
        }}
      >
        <option value="">Todos los estados</option>
        <option value="success">Éxito</option>
        <option value="partial">Parcial</option>
        <option value="error">Error</option>
      </select>

      <select
        className={styles.filterSelect}
        value={provider || ''}
        onChange={(e) => onProviderChange(e.target.value || undefined)}
      >
        <option value="">Todos los proveedores</option>
        <option value="lastfm">Last.fm</option>
        <option value="fanart">Fanart.tv</option>
        <option value="musicbrainz">MusicBrainz</option>
      </select>
    </div>
  );
}
