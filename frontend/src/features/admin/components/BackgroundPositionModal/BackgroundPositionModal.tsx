import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Loader, Move } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useUpdateBackgroundPosition } from '../../hooks/useArtistAvatars';
import styles from './BackgroundPositionModal.module.css';

interface BackgroundPositionModalProps {
  artistId: string;
  artistName: string;
  backgroundUrl: string;
  initialPosition?: string; // Initial CSS background-position value
  onClose: () => void;
  onSuccess?: () => void;
}

// Scale factor for the preview image (makes it larger than cover size to allow dragging)
const SCALE_FACTOR = 1.8;

/**
 * BackgroundPositionModal Component
 * Facebook-style drag-to-reposition interface for background images
 * Shows a fixed viewport (hero area) and allows dragging the image within it
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

        // Calculate image size to cover the container
        const containerRatio = containerWidth / containerHeight;
        const imageRatio = img.naturalWidth / img.naturalHeight;

        let renderWidth: number;
        let renderHeight: number;

        if (imageRatio > containerRatio) {
          // Image is wider - fit by height
          renderHeight = containerHeight;
          renderWidth = renderHeight * imageRatio;
        } else {
          // Image is taller - fit by width
          renderWidth = containerWidth;
          renderHeight = renderWidth / imageRatio;
        }

        // Scale image larger to provide dragging space
        renderWidth *= SCALE_FACTOR;
        renderHeight *= SCALE_FACTOR;

        // Save calculated dimensions
        setImageDimensions({ width: renderWidth, height: renderHeight });

        // Parse background-position to calculate initial offset
        const parts = initialPosition.split(' ');
        const xPart = parts[0] || 'center';
        const yPart = parts[1] || 'top';

        let xOffset = 0;
        let yOffset = 0;

        // Calculate X offset
        if (xPart === 'center') {
          xOffset = -(renderWidth - containerWidth) / 2;
        } else if (xPart === 'right') {
          xOffset = -(renderWidth - containerWidth);
        } else if (xPart.endsWith('%')) {
          const percent = parseFloat(xPart);
          xOffset = -((renderWidth - containerWidth) * percent) / 100;
        }

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
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current;
    const image = imageRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = image.clientWidth;
    const imageHeight = image.clientHeight;

    let newX = clientX - dragStartRef.current.x;
    let newY = clientY - dragStartRef.current.y;

    // Constrain movement (image can't reveal edges)
    const maxX = 0;
    const minX = containerWidth - imageWidth;
    const maxY = 0;
    const minY = containerHeight - imageHeight;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setImagePosition({ x: newX, y: newY });
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
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Image dimensions in the preview are scaled by SCALE_FACTOR
    // But CSS background-position assumes cover size, so we need to un-scale
    const scaledImageWidth = image.clientWidth;
    const scaledImageHeight = image.clientHeight;
    const imageWidth = scaledImageWidth / SCALE_FACTOR;
    const imageHeight = scaledImageHeight / SCALE_FACTOR;

    // Calculate percentage position
    // background-position percentage is calculated as:
    // (container - image) * (percent / 100) = offset
    // So: percent = (offset / (container - image)) * 100
    // Since our offset is negative (image position), we need to invert it
    // We also need to scale the offset since the preview image is larger
    const scaledOffsetX = imagePosition.x / SCALE_FACTOR;
    const scaledOffsetY = imagePosition.y / SCALE_FACTOR;

    const widthDiff = imageWidth - containerWidth;
    const heightDiff = imageHeight - containerHeight;

    let xPercent = 50; // default center
    let yPercent = 0;  // default top

    if (widthDiff > 0) {
      // Image is wider than container
      xPercent = (Math.abs(scaledOffsetX) / widthDiff) * 100;
    }

    if (heightDiff > 0) {
      // Image is taller than container
      yPercent = (Math.abs(scaledOffsetY) / heightDiff) * 100;
    }

    // Clamp values
    const xClamped = Math.max(0, Math.min(100, xPercent));
    const yClamped = Math.max(0, Math.min(100, yPercent));

    return `${xClamped.toFixed(1)}% ${yClamped.toFixed(1)}%`;
  };

  const handleSave = () => {
    const cssPosition = calculateBackgroundPosition();
    console.log('[BackgroundPositionModal] Saving position:', cssPosition);

    updatePosition(
      {
        artistId,
        backgroundPosition: cssPosition,
      },
      {
        onSuccess: () => {
          console.log('[BackgroundPositionModal] ✅ Position saved successfully');
          onSuccess?.();
          onClose();
        },
        onError: (error) => {
          console.error('[BackgroundPositionModal] ❌ Failed to save position:', error);
        },
      },
    );
  };

  const handleReset = () => {
    if (containerRef.current && imageRef.current) {
      const container = containerRef.current;
      const image = imageRef.current;
      const containerWidth = container.clientWidth;
      const imageWidth = image.clientWidth;

      // Reset to center horizontally, top vertically
      setImagePosition({
        x: -(imageWidth - containerWidth) / 2,
        y: 0,
      });
    }
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
