import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className={styles.comparisonView}>
      {/* Current Side */}
      <div className={styles.comparisonSide}>
        <div className={styles.comparisonLabel}>{t('admin.metadata.currentLabel')}</div>
        {isImage && currentImageUrl ? (
          <>
            <ImageWithFallback
              src={currentImageUrl}
              alt="Current"
              className={styles.imageCompact}
              fallbackMessage={t('admin.metadata.fileNotFound')}
            />
            {conflict.metadata?.currentResolution ? (
              <div className={styles.resolutionText}>{conflict.metadata.currentResolution}</div>
            ) : (
              <div className={`${styles.sourceText} ${styles.sourceTextMuted}`}>
                {t('admin.metadata.resolutionUnavailable')}
              </div>
            )}
            {conflict.metadata?.currentSource && (
              <div className={styles.sourceText}>{conflict.metadata.currentSource}</div>
            )}
          </>
        ) : isImage ? (
          <div className={styles.emptyImage}>
            <div>{t('admin.metadata.noCoverCurrent')}</div>
            <div className={styles.emptyImageHint}>{t('admin.metadata.fileDeletedOrMissing')}</div>
          </div>
        ) : (
          <div className={styles.textPreview}>
            {conflict.currentValue || (
              <span className={styles.emptyText}>{t('admin.metadata.noData')}</span>
            )}
          </div>
        )}
      </div>

      {/* VS Divider */}
      <div className={styles.vsDivider}>
        <div className={styles.vsCircle}>VS</div>
      </div>

      {/* Suggested Side */}
      <div className={styles.comparisonSide}>
        <div className={styles.comparisonLabel}>{t('admin.metadata.suggestedLabel')}</div>
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
              <div className={styles.resolutionText}>{conflict.metadata.suggestedResolution}</div>
            ) : (
              <div className={`${styles.sourceText} ${styles.sourceTextMuted}`}>
                {t('admin.metadata.resolutionUnavailable')}
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
