import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { setRating, removeRating, type ItemType } from '@shared/services/interactions.service';
import { logger } from '@shared/utils/logger';
import styles from './RatingStars.module.css';

interface RatingStarsProps {
  itemId: string;
  itemType: ItemType;
  /** Rating actual del usuario (0-5). El padre es responsable de proveerlo. */
  initialRating?: number;
  size?: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
}

/**
 * RatingStars Component
 * Interactive 5-star rating system.
 * No hace fetch interno — recibe initialRating del padre.
 */
export function RatingStars({
  itemId,
  itemType,
  initialRating = 0,
  size = 18,
  onRatingChange,
  readOnly = false,
}: RatingStarsProps) {
  const { t } = useTranslation();
  const [rating, setLocalRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    setLocalRating(initialRating);
  }, [initialRating]);

  const handleClick = async (value: number) => {
    if (readOnly || isLoading || pendingRef.current) return;

    pendingRef.current = true;
    setIsLoading(true);
    try {
      if (value === rating) {
        await removeRating(itemId, itemType);
        setLocalRating(0);
        onRatingChange?.(0);
      } else {
        await setRating(itemId, itemType, value);
        setLocalRating(value);
        onRatingChange?.(value);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error updating rating:', error);
      }
    } finally {
      pendingRef.current = false;
      setIsLoading(false);
    }
  };

  const getStarClass = (index: number) => {
    const value = index + 1;
    const filled = hover ? value <= hover : value <= rating;

    if (filled) {
      if (value === 1) return styles.star1;
      if (value === 2) return styles.star2;
      if (value === 3) return styles.star3;
      if (value === 4) return styles.star4;
      if (value === 5) return styles.star5;
    }

    return '';
  };

  const getHoverClass = (index: number) => {
    if (!hover || readOnly) return '';

    const value = index + 1;
    if (value <= hover) {
      if (hover === 1) return styles.hover1;
      if (hover === 2) return styles.hover2;
      if (hover === 3) return styles.hover3;
      if (hover === 4) return styles.hover4;
      if (hover === 5) return styles.hover5;
    }

    return '';
  };

  const ratingLabels = [
    t('common.ratingBad', 'Malo'),
    t('common.ratingFair', 'Regular'),
    t('common.ratingGood', 'Bueno'),
    t('common.ratingVeryGood', 'Muy bueno'),
    t('common.ratingExcellent', 'Excelente'),
  ];

  return (
    <div
      className={`${styles.rating} ${readOnly ? styles.readOnly : ''} ${isLoading ? styles.loading : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {[...Array(5)].map((_, index) => {
        const value = 5 - index;

        return (
          <button
            key={value}
            type="button"
            className={`${styles.starButton} ${getStarClass(value - 1)} ${getHoverClass(value - 1)}`}
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readOnly && setHover(value)}
            onMouseLeave={() => setHover(0)}
            disabled={readOnly || isLoading}
            aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
            title={ratingLabels[value - 1]}
          >
            <Star size={size} fill="currentColor" />
          </button>
        );
      })}
    </div>
  );
}
