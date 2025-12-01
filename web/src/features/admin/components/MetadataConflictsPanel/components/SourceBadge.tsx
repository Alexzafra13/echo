import styles from '../MetadataConflictsPanel.module.css';

interface SourceBadgeProps {
  source: string;
}

const SOURCE_LABELS: Record<string, string> = {
  musicbrainz: 'MusicBrainz',
  coverartarchive: 'Cover Art Archive',
  lastfm: 'Last.fm',
  fanart: 'Fanart.tv',
};

/**
 * Source badge component - displays the metadata source
 */
export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className={styles.sourceBadge}>
      {SOURCE_LABELS[source] || source}
    </span>
  );
}
