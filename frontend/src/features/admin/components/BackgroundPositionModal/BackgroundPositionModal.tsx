import { useState, useRef, useEffect } from 'react';
import { X, Check, Loader } from 'lucide-react';
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
 * Professional drag-to-position interface for background images
 */
export function BackgroundPositionModal({
  artistId,
  artistName,
  backgroundUrl,
  initialPosition = 'center center',
  onClose,
  onSuccess,
}: BackgroundPositionModalProps) {
  // Parse initial position or default to center
  const parsePosition = (pos: string): { x: number; y: number } => {
    const parts = pos.split(' ');
    const xPart = parts[0] || 'center';
    const yPart = parts[1] || 'center';

    const parseValue = (value: string, isX: boolean): number => {
      if (value === 'center') return 50;
      if (value === 'top') return 0;
      if (value === 'bottom') return 100;
      if (value === 'left') return 0;
      if (value === 'right') return 100;
      if (value.endsWith('%')) return parseFloat(value);
      // For px values, convert to approximate percentage (assuming 1920x1080 viewport)
      if (value.endsWith('px')) {
        const px = parseFloat(value);
        const dimension = isX ? 1920 : 1080;
        return (px / dimension) * 100;
      }
      return 50;
    };

    return {
      x: parseValue(xPart, true),
      y: parseValue(yPart, false),
    };
  };

  const initial = parsePosition(initialPosition);
  const [position, setPosition] = useState(initial);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { mutate: updatePosition, isPending } = useUpdateBackgroundPosition();

  // Handle mouse/touch drag
  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Add global pointer up listener
  useEffect(() => {
    const handleGlobalPointerUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('pointerup', handleGlobalPointerUp);
      return () => document.removeEventListener('pointerup', handleGlobalPointerUp);
    }
  }, [isDragging]);

  const handleSave = () => {
    const cssPosition = `${position.x.toFixed(1)}% ${position.y.toFixed(1)}%`;
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
    setPosition({ x: 50, y: 50 });
  };

  return (
    <div className={styles.modal__overlay} onClick={onClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>Ajustar posición del fondo</h2>
          <button className={styles.modal__closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modal__body}>
          <p className={styles.modal__description}>
            Arrastra la imagen para ajustar su posición en el fondo de {artistName}
          </p>

          <div
            ref={containerRef}
            className={styles.preview}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundPosition: `${position.x}% ${position.y}%`,
              backgroundSize: 'cover',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            <div className={styles.preview__overlay}>
              <div className={styles.preview__instructions}>
                {isDragging ? 'Arrastrando...' : 'Haz clic y arrastra para ajustar'}
              </div>
            </div>

            {/* Crosshair to show focal point */}
            <div
              className={styles.preview__crosshair}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
              }}
            >
              <div className={styles.preview__crosshairH} />
              <div className={styles.preview__crosshairV} />
            </div>
          </div>

          <div className={styles.modal__positionInfo}>
            Posición: {position.x.toFixed(1)}% × {position.y.toFixed(1)}%
          </div>
        </div>

        <div className={styles.modal__footer}>
          <Button variant="secondary" onClick={handleReset} disabled={isPending}>
            Restablecer
          </Button>
          <div className={styles.modal__footerRight}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
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
