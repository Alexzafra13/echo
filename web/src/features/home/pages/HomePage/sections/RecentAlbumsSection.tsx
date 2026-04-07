import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumGrid } from '../../../components';
import type { Album } from '../../../types';

interface RecentAlbumsSectionProps {
  albums: Album[];
}

export const RecentAlbumsSection = memo(function RecentAlbumsSection({
  albums,
}: RecentAlbumsSectionProps) {
  const { t } = useTranslation();

  if (albums.length === 0) return null;

  return (
    <AlbumGrid title={t('home.recentlyAdded')} albums={albums} showViewAll viewAllPath="/albums" />
  );
});
