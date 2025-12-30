import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Loader, Move } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useUpdateBackgroundPosition } from '../../hooks/useArtistAvatars';
import { logger } from '@shared/utils/logger';
import styles from './BackgroundPositionModal.module.css';

interface BackgroundPositionModalProps {
  artistId: string;
  artistName: string;
  backgroundUrl: string;
  initialPosition?: string; // Initial CSS background-position value
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * BackgroundPositionModal Component
 * Drag-to-reposition interface for background images
 * Shows a fixed viewport (hero area) and allows dragging the image within it
 * Uses background-size: 100% (width 100%, height auto) matching the actual CSS
 */
export function BackgroundPositionModal({
  artistId,
  artistName,
  backgroundUrl,
  initialPosition = 'center top',
  onClose,
  onSuccess,
}: BackgroundPositionModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { mutate: updatePosition, isPending } = useUpdateBackgroundPosition();

  // Load image and calculate initial position
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);

      // Calculate initial position based on initialPosition prop
      if (containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Use background-size: 100% logic (NOT cover)
        // Width is always 100% of container, height scales proportionally
        const imageRatio = img.naturalWidth / img.naturalHeight;
        const renderWidth = containerWidth;
        const renderHeight = containerWidth / imageRatio;

        // Save calculated dimensions
        setImageDimensions({ width: renderWidth, height: renderHeight });

        // Parse background-position to calculate initial offset
        const parts = initialPosition.split(' ');
        const yPart = parts[1] || 'top';

        let xOffset = 0;
        let yOffset = 0;

        // X is always 0 since width === containerWidth
        xOffset = 0;

        // Calculate Y offset
        if (yPart === 'center') {
          yOffset = -(renderHeight - containerHeight) / 2;
        } else if (yPart === 'bottom') {
          yOffset = -(renderHeight - containerHeight);
        } else if (yPart === 'top') {
          yOffset = 0;
        } else if (yPart.endsWith('%')) {
          const percent = parseFloat(yPart);
          yOffset = -((renderHeight - containerHeight) * percent) / 100;
        }

        setImagePosition({ x: xOffset, y: yOffset });
      }
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, initialPosition]);

  // Handle drag move with useCallback to avoid recreating on every render
  const handleMove = useCallback((_clientX: number, clientY: number) => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current;
    const image = imageRef.current;
    const containerHeight = container.clientHeight;
    const imageHeight = image.clientHeight;

    // Only vertical movement (background-size: 100% keeps width fixed)
    let newY = clientY - dragStartRef.current.y;

    // Constrain movement (image can't reveal edges)
    const maxY = 0;
    const minY = containerHeight - imageHeight;

    newY = Math.max(minY, Math.min(maxY, newY));

    setImagePosition({ x: 0, y: newY });
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y,
    };
  }, [imagePosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers - registered with {passive: false} to allow preventDefault
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault(); // Prevent scrolling
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX - imagePosition.x,
      y: touch.clientY - imagePosition.y,
    };
  }, [imagePosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [isDragging, handleMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      // Mouse events
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch event listeners with {passive: false}
  useEffect(() => {
    const overlay = containerRef.current;
    if (!overlay) return;

    overlay.addEventListener('touchstart', handleTouchStart, { passive: false });

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }

    return () => {
      overlay.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isDragging, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Convert image position to CSS background-position
  const calculateBackgroundPosition = (): string => {
    if (!containerRef.current || !imageRef.current) return 'center top';

    const container = containerRef.current;
    const image = imageRef.current;
    const containerHeight = container.clientHeight;
    const imageHeight = image.clientHeight;

    // Calculate percentage position
    // background-position percentage is calculated as:
    // (container - image) * (percent / 100) = offset
    // So: percent = (offset / (container - image)) * 100
    const heightDiff = imageHeight - containerHeight;

    // X is always center (50%) since width is always 100%
    const xPercent = 50;
    let yPercent = 0;  // default top

    if (heightDiff > 0) {
      // Image is taller than container
      yPercent = (Math.abs(imagePosition.y) / heightDiff) * 100;
    }

    // Clamp values
    const xClamped = Math.max(0, Math.min(100, xPercent));
    const yClamped = Math.max(0, Math.min(100, yPercent));

    return `${xClamped.toFixed(1)}% ${yClamped.toFixed(1)}%`;
  };

  const handleSave = () => {
    const cssPosition = calculateBackgroundPosition();

    updatePosition(
      {
        artistId,
        backgroundPosition: cssPosition,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (error) => {
          if (import.meta.env.DEV) {
            logger.error('[BackgroundPositionModal] ❌ Failed to save position:', error);
          }
        },
      },
    );
  };

  const handleReset = () => {
    // Reset to top (Y=0, X always 0 with background-size: 100%)
    setImagePosition({
      x: 0,
      y: 0,
    });
  };

  return (
    <div className={styles.modal__overlay} onClick={onClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>
            <Move size={20} />
            Ajustar posición del fondo
          </h2>
          <button className={styles.modal__closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modal__body}>
          <p className={styles.modal__description}>
            Arrastra la imagen para ajustar cómo se muestra en el fondo de <strong>{artistName}</strong>.
            La vista previa muestra exactamente la porción que se verá.
          </p>

          {/* Fixed viewport container (like hero section) */}
          <div
            ref={containerRef}
            className={styles.preview}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
          >
            {!imageLoaded && (
              <div className={styles.preview__loading}>
                <Loader size={32} className={styles.spinner} />
                <span>Cargando imagen...</span>
              </div>
            )}

            {imageLoaded && (
              <>
                {/* Draggable image */}
                <img
                  ref={imageRef}
                  src={backgroundUrl}
                  alt={artistName}
                  className={styles.preview__image}
                  style={{
                    width: `${imageDimensions.width}px`,
                    height: `${imageDimensions.height}px`,
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  }}
                  draggable={false}
                />

                {/* Overlay with instructions */}
                <div className={styles.preview__overlay}>
                  <div className={styles.preview__instructions}>
                    {isDragging ? (
                      <>
                        <Move size={16} />
                        Arrastrando...
                      </>
                    ) : (
                      <>
                        <Move size={16} />
                        Arrastra para ajustar
                      </>
                    )}
                  </div>
                </div>

                {/* Frame indicator */}
                <div className={styles.preview__frame} />
              </>
            )}
          </div>

          {imageLoaded && (
            <div className={styles.modal__positionInfo}>
              Posición: {calculateBackgroundPosition()}
            </div>
          )}
        </div>

        <div className={styles.modal__footer}>
          <Button variant="secondary" onClick={handleReset} disabled={isPending || !imageLoaded}>
            Restablecer
          </Button>
          <div className={styles.modal__footerRight}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending || !imageLoaded}>
              {isPending ? (
                <>
                  <Loader size={16} className={styles.spinner} />
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
