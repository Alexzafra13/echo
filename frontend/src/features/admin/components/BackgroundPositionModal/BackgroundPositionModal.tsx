import { useState, useRef, useEffect } from 'react';
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
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { mutate: updatePosition, isPending } = useUpdateBackgroundPosition();

  // Parse initial background-position to image offset
  const parseInitialPosition = (pos: string): { x: number; y: number } => {
    const parts = pos.split(' ');
    let xPart = parts[0] || 'center';
    let yPart = parts[1] || 'top';

    // For now, return defaults - we'll calculate actual position after image loads
    return { x: 0, y: 0 };
  };

  // Load image and calculate initial position
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
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

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragStart({
      x: clientX - imagePosition.x,
      y: clientY - imagePosition.y,
    });
  };

  // Handle drag move
  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current || !imageRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let newX = clientX - dragStart.x;
    let newY = clientY - dragStart.y;

    // Get dimensions
    const container = containerRef.current;
    const image = imageRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = image.clientWidth;
    const imageHeight = image.clientHeight;

    // Constrain movement (image can't reveal edges)
    const maxX = 0;
    const minX = containerWidth - imageWidth;
    const maxY = 0;
    const minY = containerHeight - imageHeight;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setImagePosition({ x: newX, y: newY });
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse/touch event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, imagePosition]);

  // Convert image position to CSS background-position
  const calculateBackgroundPosition = (): string => {
    if (!containerRef.current || !imageRef.current) return 'center top';

    const container = containerRef.current;
    const image = imageRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = image.clientWidth;
    const imageHeight = image.clientHeight;

    // Calculate percentage position
    // background-position percentage is calculated as:
    // (container - image) * (percent / 100) = offset
    // So: percent = (offset / (container - image)) * 100
    // Since our offset is negative (image position), we need to invert it
    const widthDiff = imageWidth - containerWidth;
    const heightDiff = imageHeight - containerHeight;

    let xPercent = 50; // default center
    let yPercent = 0;  // default top

    if (widthDiff > 0) {
      // Image is wider than container
      xPercent = (Math.abs(imagePosition.x) / widthDiff) * 100;
    }

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
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                  draggable={false}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                />

                {/* Overlay with instructions */}
                <div
                  className={styles.preview__overlay}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                >
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
