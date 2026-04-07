import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SharedAlbumGrid } from '@features/federation';
import type { SharedAlbum } from '@features/federation';

interface SharedAlbumsSectionProps {
  albums: SharedAlbum[];
}

export const SharedAlbumsSection = memo(function SharedAlbumsSection({
  albums,
}: SharedAlbumsSectionProps) {
  const { t } = useTranslation();

  return (
    <SharedAlbumGrid
      title={t('home.sharedLibraries')}
      albums={albums}
      showViewAll={albums.length > 0}
      viewAllPath="/albums?source=shared"
      showEmptyState
    />
  );
});
