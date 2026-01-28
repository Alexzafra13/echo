import { ImageWithFallback } from './ImageWithFallback';
import { logger } from '@shared/utils/logger';
import type { MetadataConflict } from '../../../hooks/useMetadataConflicts';
import styles from '../MetadataConflictsPanel.module.css';

interface ComparisonViewProps {
  conflict: MetadataConflict;
  isImage: boolean;
  currentImageUrl: string | undefined;
  suggestedImageUrl: string | undefined;
}

export function ComparisonView({
  conflict,
  isImage,
  currentImageUrl,
  suggestedImageUrl,
}: ComparisonViewProps) {
  return (
    <div className={styles.comparisonView}>
      {/* Current Side */}
      <div className={styles.comparisonSide}>
        <div className={styles.comparisonLabel}>Actual</div>
        {isImage && currentImageUrl ? (
          <>
            <ImageWithFallback
              src={currentImageUrl}
              alt="Current"
              className={styles.imageCompact}
              fallbackMessage="Archivo no encontrado"
            />
            {conflict.metadata?.currentResolution ? (
              <div className={styles.resolutionText}>
                {conflict.metadata.currentResolution}
              </div>
            ) : (
              <div
                className={styles.sourceText}
                style={{ fontStyle: 'italic', opacity: 0.7 }}
              >
                Resolución no disponible
              </div>
            )}
            {conflict.metadata?.currentSource && (
              <div className={styles.sourceText}>{conflict.metadata.currentSource}</div>
            )}
          </>
        ) : isImage ? (
          <div className={styles.emptyImage}>
            <div>Sin carátula actual</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>
              (archivo eliminado o no encontrado)
            </div>
          </div>
        ) : (
          <div className={styles.textPreview}>
            {conflict.currentValue || <span className={styles.emptyText}>Sin datos</span>}
          </div>
        )}
      </div>

      {/* VS Divider */}
      <div className={styles.vsDivider}>
        <div className={styles.vsCircle}>VS</div>
      </div>

      {/* Suggested Side */}
      <div className={styles.comparisonSide}>
        <div className={styles.comparisonLabel}>Sugerida</div>
        {isImage ? (
          <>
            <div className={styles.imageCompact}>
              <img
                src={suggestedImageUrl}
                alt="Suggested"
                onError={(e) => {
                  if (import.meta.env.DEV) {
                    logger.error(
                      'Error loading suggested cover:',
                      suggestedImageUrl,
                      'for conflict:',
                      conflict.id
                    );
                  }
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            {conflict.metadata?.suggestedResolution &&
            conflict.metadata.suggestedResolution !== 'Desconocida' ? (
              <div className={styles.resolutionText}>
                {conflict.metadata.suggestedResolution}
              </div>
            ) : (
              <div
                className={styles.sourceText}
                style={{ fontStyle: 'italic', opacity: 0.7 }}
              >
                Resolución no disponible
              </div>
            )}
          </>
        ) : (
          <div className={styles.textPreview}>{conflict.suggestedValue}</div>
        )}
      </div>
    </div>
  );
}
