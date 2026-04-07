import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumGrid } from '../../../components';
import type { Album } from '../../../types';

interface RecentlyPlayedSectionProps {
  albums: Album[];
}

export const RecentlyPlayedSection = memo(function RecentlyPlayedSection({
  albums,
}: RecentlyPlayedSectionProps) {
  const { t } = useTranslation();

  if (albums.length === 0) return null;

  return <AlbumGrid title={t('home.recentlyPlayed')} albums={albums} showViewAll={false} />;
});
