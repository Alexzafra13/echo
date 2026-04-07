import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, Loader2, ImageOff, Check } from 'lucide-react';
import { Modal } from '@shared/components/ui/Modal/Modal';
import type { FaviconPreview } from '@features/admin/api/radio-favicons.service';
import styles from './FaviconPreviewModal.module.css';

const SOURCE_LABELS: Record<string, string> = {
  'apple-touch-icon': 'Apple Touch Icon',
  'google-favicon': 'Google Favicon',
  wikipedia: 'Wikipedia',
};

interface FaviconPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationName: string;
  previews: FaviconPreview[];
  isLoading: boolean;
  isSaving: boolean;
  onSelect: (preview: FaviconPreview) => void;
}

export function FaviconPreviewModal({
  isOpen,
  onClose,
  stationName,
  previews,
  isLoading,
  isSaving,
  onSelect,
}: FaviconPreviewModalProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (preview: FaviconPreview, index: number) => {
    setSelectedIndex(index);
    onSelect(preview);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('radio.faviconSearchTitle', { stationName })}
      icon={Wand2}
      subtitle={t('radio.faviconSearchSubtitle')}
      width="480px"
    >
      <div className={styles.container}>
        {isLoading && (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} />
            <p>{t('radio.faviconSearching')}</p>
          </div>
        )}

        {!isLoading && previews.length === 0 && (
          <div className={styles.empty}>
            <ImageOff size={48} />
            <p>{t('radio.faviconNoResults')}</p>
          </div>
        )}

        {!isLoading && previews.length > 0 && (
          <div className={styles.grid}>
            {previews.map((preview, index) => (
              <button
                key={`${preview.source}-${index}`}
                className={`${styles.previewCard} ${selectedIndex === index ? styles['previewCard--selected'] : ''}`}
                onClick={() => handleSelect(preview, index)}
                disabled={isSaving}
              >
                <div className={styles.previewImageContainer}>
                  <img
                    src={preview.dataUrl}
                    alt={`${SOURCE_LABELS[preview.source] || preview.source}`}
                    className={styles.previewImage}
                  />
                  {selectedIndex === index && isSaving && (
                    <div className={styles.previewOverlay}>
                      <Loader2 size={24} className={styles.spinner} />
                    </div>
                  )}
                  {selectedIndex === index && !isSaving && (
                    <div className={styles.previewCheck}>
                      <Check size={16} />
                    </div>
                  )}
                </div>
                <div className={styles.previewInfo}>
                  <span className={styles.previewSource}>
                    {SOURCE_LABELS[preview.source] || preview.source}
                  </span>
                  <span className={styles.previewSize}>{formatSize(preview.size)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
