import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumGrid } from '../../../components';
import type { Album } from '../../../types';

interface TopPlayedSectionProps {
  albums: Album[];
}

export const TopPlayedSection = memo(function TopPlayedSection({ albums }: TopPlayedSectionProps) {
  const { t } = useTranslation();

  if (albums.length === 0) return null;

  return <AlbumGrid title={t('home.mostPlayed')} albums={albums} showViewAll={false} />;
});
