import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { AlbumGrid } from '../../components';
import type { Album } from '../../types';
import styles from './HomePage.module.css';

interface SurpriseMeSectionProps {
  albums: Album[];
  onRefresh: () => void;
}

export function SurpriseMeSection({ albums, onRefresh }: SurpriseMeSectionProps) {
  const { t } = useTranslation();
  if (albums.length === 0) return null;

  return (
    <section className={styles.homeSection}>
      <div className={styles.homeSection__headerRow}>
        <h2 className={styles.homeSection__title}>{t('home.surpriseMe')}</h2>
        <button
          className={styles.homeSection__refreshButton}
          onClick={onRefresh}
          title={t('home.getOtherRandom')}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <AlbumGrid title="" albums={albums} />
    </section>
  );
}
