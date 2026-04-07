import { memo } from 'react';
import { TrackCard } from './TrackCard';
import type { SessionQueueItem } from '../../../types';
import styles from '../SessionPage.module.css';

interface SuggestionsSectionProps {
  recommendations: { id: string; title: string; artistName?: string; albumId?: string }[];
  queue: SessionQueueItem[];
  searchQuery: string;
  onAdd: (id: string) => void;
  addedTrackId: string | null;
}

export const SuggestionsSection = memo(function SuggestionsSection({
  recommendations,
  queue,
  searchQuery,
  onAdd,
  addedTrackId,
}: SuggestionsSectionProps) {
  const queueTrackIds = new Set(queue.map((q) => q.trackId));
  const filtered = recommendations.filter((t) => !queueTrackIds.has(t.id));

  if (filtered.length === 0 || searchQuery.trim()) return null;

  return (
    <div className={styles.trackGrid}>
      {filtered.slice(0, 8).map((t) => (
        <TrackCard key={t.id} track={t} onAdd={onAdd} added={addedTrackId === t.id} />
      ))}
    </div>
  );
});
