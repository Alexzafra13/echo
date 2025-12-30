import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  toggleLike,
  toggleDislike,
  getItemInteractionSummary,
  type ItemType,
  type Sentiment
} from '@shared/services/interactions.service';
import styles from './LikeDislikeButtons.module.css';

interface LikeDislikeButtonsProps {
  itemId: string;
  itemType: ItemType;
  initialSentiment?: Sentiment | null;
  size?: number;
  onSentimentChange?: (sentiment: Sentiment | null) => void;
  readOnly?: boolean;
}

/**
 * LikeDislikeButtons Component
 * Interactive like/dislike buttons
 *
 * @example
 * <LikeDislikeButtons itemId={track.id} itemType="track" initialSentiment="like" />
 */
export function LikeDislikeButtons({
  itemId,
  itemType,
  initialSentiment = null,
  size = 18,
  onSentimentChange,
  readOnly = false,
}: LikeDislikeButtonsProps) {
  const [sentiment, setSentiment] = useState<Sentiment | null>(initialSentiment);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial state from API
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const summary = await getItemInteractionSummary(itemId, itemType);
        if (summary.userSentiment) {
          setSentiment(summary.userSentiment as Sentiment);
        }
      } catch (error) {
        // Silently fail - item might not have interactions yet
        if (import.meta.env.DEV) {
          console.debug('No interactions found for item:', itemId);
        }
      }
    };

    loadInitialState();
  }, [itemId, itemType]);

  useEffect(() => {
    setSentiment(initialSentiment);
  }, [initialSentiment]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || isLoading) return;

    setIsLoading(true);
    try {
      const response = await toggleLike(itemId, itemType);
      const newSentiment = response.liked ? 'like' : null;
      setSentiment(newSentiment);
      onSentimentChange?.(newSentiment);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error toggling like:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || isLoading) return;

    setIsLoading(true);
    try {
      const response = await toggleDislike(itemId, itemType);
      const newSentiment = response.disliked ? 'dislike' : null;
      setSentiment(newSentiment);
      onSentimentChange?.(newSentiment);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error toggling dislike:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${styles.likeDislike} ${readOnly ? styles.readOnly : ''} ${isLoading ? styles.loading : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`${styles.button} ${styles.likeButton} ${sentiment === 'like' ? styles.active : ''}`}
        onClick={handleLike}
        disabled={readOnly || isLoading}
        aria-label="Me gusta"
        title="Me gusta"
      >
        <ThumbsUp size={size} fill={sentiment === 'like' ? 'currentColor' : 'none'} />
      </button>

      <button
        type="button"
        className={`${styles.button} ${styles.dislikeButton} ${sentiment === 'dislike' ? styles.active : ''}`}
        onClick={handleDislike}
        disabled={readOnly || isLoading}
        aria-label="No me gusta"
        title="No me gusta"
      >
        <ThumbsDown size={size} fill={sentiment === 'dislike' ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
