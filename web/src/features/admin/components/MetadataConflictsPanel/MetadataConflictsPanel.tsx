import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Sparkles } from 'lucide-react';
import { CollapsibleInfo } from '@shared/components/ui';
import { useMetadataConflicts, type MetadataConflict } from '../../hooks/useMetadataConflicts';
import { ArtistSidebarItem, ConflictCard } from './components';
import styles from './MetadataConflictsPanel.module.css';

/**
 * Panel de conflictos de metadata. Solo se muestra si hay sugerencias pendientes.
 */
export function MetadataConflictsPanel() {
  const { t } = useTranslation();
  const filters = {
    skip: 0,
    take: 100,
  };

  const { data, isLoading, error } = useMetadataConflicts(filters);
  const [selectedArtist, setSelectedArtist] = useState<string>('');

  const conflicts = data?.conflicts || [];
  const total = data?.total || 0;

  const groupedConflicts = useMemo(
    () =>
      conflicts.reduce(
        (groups, conflict) => {
          const artistName = conflict.metadata?.artistName || t('admin.metadata.noArtist');
          if (!groups[artistName]) {
            groups[artistName] = [];
          }
          groups[artistName].push(conflict);
          return groups;
        },
        {} as Record<string, MetadataConflict[]>
      ),
    [conflicts, t]
  );

  const sortedArtists = useMemo(
    () => Object.entries(groupedConflicts).sort(([, a], [, b]) => b.length - a.length),
    [groupedConflicts]
  );

  // Don't render anything if loading or no suggestions
  if (isLoading || conflicts.length === 0) {
    return null;
  }

  const effectiveSelectedArtist =
    selectedArtist && groupedConflicts[selectedArtist]
      ? selectedArtist
      : sortedArtists.length > 0
        ? sortedArtists[0][0]
        : '';

  if (effectiveSelectedArtist !== selectedArtist) {
    setSelectedArtist(effectiveSelectedArtist);
  }

  const selectedConflicts = effectiveSelectedArtist
    ? groupedConflicts[effectiveSelectedArtist] || []
    : [];

  // Handle error state
  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.errorState}>
          <AlertCircle size={24} />
          <p>{t('admin.metadata.loadError')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={22} className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>{t('admin.metadata.suggestions')}</h2>
            <p className={styles.description}>
              {t('admin.metadata.pendingSuggestions', { count: total })}
            </p>
          </div>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeCount}>{total}</span>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.contentLayout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>{t('admin.metadata.artistsSidebar')}</h3>
              <span className={styles.sidebarCount}>{sortedArtists.length}</span>
            </div>
            <div className={styles.sidebarList}>
              {sortedArtists.map(([artistName, artistConflicts]) => (
                <ArtistSidebarItem
                  key={artistName}
                  artistName={artistName}
                  conflictCount={artistConflicts.length}
                  isSelected={effectiveSelectedArtist === artistName}
                  onClick={() => setSelectedArtist(artistName)}
                />
              ))}
            </div>
          </aside>

          <main className={styles.mainContent}>
            {effectiveSelectedArtist && (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <h3 className={styles.detailTitle}>{effectiveSelectedArtist}</h3>
                    <p className={styles.detailSubtitle}>
                      {selectedConflicts.length === 1
                        ? t('admin.metadata.conflictPending', { count: selectedConflicts.length })
                        : t('admin.metadata.conflictsPending', { count: selectedConflicts.length })}
                    </p>
                  </div>
                </div>
                <div className={styles.conflictsList}>
                  {selectedConflicts.map((conflict) => (
                    <ConflictCard key={conflict.id} conflict={conflict} />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>

        <CollapsibleInfo title={t('admin.metadata.aboutSuggestions')} defaultExpanded={false}>
          <ul>
            <li>
              <strong>{t('admin.metadata.highPriorityLabel')}</strong>{' '}
              {t('admin.metadata.aboutHighPriority')}
            </li>
            <li>
              <strong>{t('admin.metadata.mediumPriorityLabel')}</strong>{' '}
              {t('admin.metadata.aboutMediumPriority')}
            </li>
            <li>
              <strong>{t('admin.metadata.acceptLabel')}</strong> {t('admin.metadata.aboutAccept')}
            </li>
            <li>
              <strong>{t('admin.metadata.rejectLabel')}</strong> {t('admin.metadata.aboutReject')}
            </li>
            <li>
              <strong>{t('admin.metadata.ignoreLabel')}</strong> {t('admin.metadata.aboutIgnore')}
            </li>
          </ul>
        </CollapsibleInfo>
      </div>
    </div>
  );
}
