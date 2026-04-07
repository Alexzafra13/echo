import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Loader, Move, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components/ui';
import { useUpdateBackgroundPosition } from '../../hooks/useArtistAvatars';
import { logger } from '@shared/utils/logger';
import styles from './BackgroundPositionModal.module.css';

interface BackgroundPositionModalProps {
  artistId: string;
  artistName: string;
  backgroundUrl: string;
  initialPosition?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BackgroundPositionModal({
  artistId,
  artistName,
  backgroundUrl,
  initialPosition = 'center top',
  onClose,
  onSuccess,
}: BackgroundPositionModalProps) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Re-render trigger — actual position lives in positionRef to avoid stale closures
  const [, setRenderTick] = useState(0);

  const positionRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageDimsRef = useRef({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { mutate: updatePosition, isPending } = useUpdateBackgroundPosition();

  const syncRender = useCallback(() => setRenderTick((t) => t + 1), []);

  // Load image and calculate initial position
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);

      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        const imageRatio = img.naturalWidth / img.naturalHeight;
        const renderWidth = containerWidth;
        const renderHeight = containerWidth / imageRatio;

        imageDimsRef.current = { width: renderWidth, height: renderHeight };

        const parts = initialPosition.split(' ');
        const yPart = parts[1] || 'top';
        let yOffset = 0;
        const heightDiff = renderHeight - containerHeight;

        if (heightDiff > 0) {
          if (yPart === 'center') {
            yOffset = -heightDiff / 2;
          } else if (yPart === 'bottom') {
            yOffset = -heightDiff;
          } else if (yPart === 'top') {
            yOffset = 0;
          } else if (yPart.endsWith('%')) {
            const percent = parseFloat(yPart);
            yOffset = -(heightDiff * percent) / 100;
          }
        }

        positionRef.current = { x: 0, y: yOffset };
        syncRender();
      }
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, initialPosition, syncRender]);

  // Clamp and apply vertical movement
  const applyMove = useCallback(
    (clientY: number) => {
      if (!containerRef.current) return;

      const containerHeight = containerRef.current.clientHeight;
      const imageHeight = imageDimsRef.current.height;

      let newY = clientY - dragStartRef.current.y;
      newY = Math.max(containerHeight - imageHeight, Math.min(0, newY));

      positionRef.current = { x: 0, y: newY };
      syncRender();
    },
    [syncRender]
  );

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      applyMove(e.clientY);
    };
    const onMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, applyMove]);

  // Touch drag
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      setIsDragging(true);
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX - positionRef.current.x,
        y: touch.clientY - positionRef.current.y,
      };
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });

    if (isDragging) {
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        applyMove(e.touches[0].clientY);
      };
      const onTouchEnd = () => setIsDragging(false);

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
      return () => {
        container.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };
    }

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
    };
  }, [isDragging, applyMove]);

  const calculateBackgroundPosition = (): string => {
    if (!containerRef.current) return '50.0% 0.0%';

    const containerHeight = containerRef.current.clientHeight;
    const imageHeight = imageDimsRef.current.height;
    const heightDiff = imageHeight - containerHeight;

    if (heightDiff <= 0) return '50.0% 0.0%';

    const yPercent = (Math.abs(positionRef.current.y) / heightDiff) * 100;
    return `50.0% ${Math.max(0, Math.min(100, yPercent)).toFixed(1)}%`;
  };

  const handleSave = () => {
    const cssPosition = calculateBackgroundPosition();

    updatePosition(
      { artistId, backgroundPosition: cssPosition },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (error) => {
          if (import.meta.env.DEV) {
            logger.error('[BackgroundPositionModal] Failed to save:', error);
          }
        },
      }
    );
  };

  const handleReset = () => {
    positionRef.current = { x: 0, y: 0 };
    syncRender();
  };

  return (
    <div className={styles.modal__overlay} onClick={onClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>
            <Move size={18} />
            {t('admin.backgroundPosition.adjustPosition', { name: artistName })}
          </h2>
          <button
            className={styles.modal__closeButton}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modal__body}>
          <p className={styles.modal__description}>{t('admin.backgroundPosition.description')}</p>

          <div
            ref={containerRef}
            className={styles.preview}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
          >
            {!imageLoaded && (
              <div className={styles.preview__loading}>
                <Loader size={24} className={styles.spinner} />
              </div>
            )}

            {imageLoaded && (
              <>
                <img
                  ref={imageRef}
                  src={backgroundUrl}
                  alt={artistName}
                  className={styles.preview__image}
                  style={{
                    width: `${imageDimsRef.current.width}px`,
                    height: `${imageDimsRef.current.height}px`,
                    transform: `translateY(${positionRef.current.y}px)`,
                  }}
                  draggable={false}
                />

                <div className={styles.preview__overlay}>
                  <div className={styles.preview__instructions}>
                    <Move size={14} />
                    {isDragging
                      ? t('admin.backgroundPosition.dragging')
                      : t('admin.backgroundPosition.dragToAdjust')}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.modal__footer}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending || !imageLoaded}
            leftIcon={<RotateCcw size={14} />}
          >
            {t('admin.backgroundPosition.reset')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending || !imageLoaded}>
            {isPending ? (
              <>
                <Loader size={14} className={styles.spinner} />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Check size={14} />
                {t('common.save')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
