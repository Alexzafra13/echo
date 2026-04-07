import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  streamUrl: string;
  title?: string;
  artistName?: string;
  onClose: () => void;
}

export function VideoPlayer({ streamUrl, title, artistName, onClose }: VideoPlayerProps) {
  const { t } = useTranslation();
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <button className={styles.closeBtn} onClick={onClose} title={t('common.close')}>
          <X size={22} />
        </button>

        <div className={styles.header}>
          <div className={styles.info}>
            {title && <span className={styles.title}>{title}</span>}
            {artistName && <span className={styles.artist}>{artistName}</span>}
          </div>
        </div>

        <video className={styles.video} src={streamUrl} controls autoPlay playsInline />
      </div>
    </div>
  );
}
