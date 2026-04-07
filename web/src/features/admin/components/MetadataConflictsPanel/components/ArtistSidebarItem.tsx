import { memo } from 'react';
import styles from '../MetadataConflictsPanel.module.css';

interface ArtistSidebarItemProps {
  artistName: string;
  conflictCount: number;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Sidebar artist item component
 */
export const ArtistSidebarItem = memo(function ArtistSidebarItem({
  artistName,
  conflictCount,
  isSelected,
  onClick,
}: ArtistSidebarItemProps) {
  return (
    <button
      className={`${styles.sidebarItem} ${isSelected ? styles.sidebarItemSelected : ''}`}
      onClick={onClick}
    >
      <div className={styles.sidebarItemContent}>
        <span className={styles.sidebarItemName}>{artistName}</span>
        <span className={styles.sidebarItemCount}>{conflictCount}</span>
      </div>
    </button>
  );
});
