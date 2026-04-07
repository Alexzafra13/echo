/**
 * History Filters Component
 *
 * Filter dropdowns for enrichment history
 */

import { useTranslation } from 'react-i18next';
import styles from './HistoryTab.module.css';

export interface HistoryFiltersProps {
  entityType?: 'artist' | 'album' | 'radio';
  status?: 'success' | 'partial' | 'error';
  provider?: string;
  onEntityTypeChange: (entityType: 'artist' | 'album' | 'radio' | undefined) => void;
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
  const { t } = useTranslation();
  return (
    <div className={styles.filters}>
      <select
        className={styles.filterSelect}
        value={entityType || ''}
        onChange={(e) => {
          const value = e.target.value;
          onEntityTypeChange(value ? (value as 'artist' | 'album' | 'radio') : undefined);
        }}
      >
        <option value="">{t('admin.metadata.historyTab.filterAllTypes')}</option>
        <option value="artist">{t('admin.metadata.historyTab.filterArtists')}</option>
        <option value="album">{t('admin.metadata.historyTab.filterAlbums')}</option>
        <option value="radio">{t('admin.metadata.historyTab.filterRadio')}</option>
      </select>

      <select
        className={styles.filterSelect}
        value={status || ''}
        onChange={(e) => {
          const value = e.target.value;
          onStatusChange(value ? (value as 'success' | 'partial' | 'error') : undefined);
        }}
      >
        <option value="">{t('admin.metadata.historyTab.filterAllStatuses')}</option>
        <option value="success">{t('admin.metadata.historyTab.filterSuccess')}</option>
        <option value="partial">{t('admin.metadata.historyTab.filterPartial')}</option>
        <option value="error">{t('admin.metadata.historyTab.filterError')}</option>
      </select>

      <select
        className={styles.filterSelect}
        value={provider || ''}
        onChange={(e) => onProviderChange(e.target.value || undefined)}
      >
        <option value="">{t('admin.metadata.historyTab.filterAllProviders')}</option>
        <option value="lastfm">Last.fm</option>
        <option value="fanart">Fanart.tv</option>
        <option value="musicbrainz">MusicBrainz</option>
        <option value="coverartarchive">Cover Art Archive</option>
        <option value="wikipedia">Wikipedia</option>
        <option value="google-favicon">Google Favicon</option>
        <option value="apple-touch-icon">Apple Touch Icon</option>
      </select>
    </div>
  );
}
