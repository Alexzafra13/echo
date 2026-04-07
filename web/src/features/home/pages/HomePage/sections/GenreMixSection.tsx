import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaylistGrid } from '../../../components';
import type { AutoPlaylist } from '@shared/services/recommendations.service';

interface GenreMixSectionProps {
  playlists: AutoPlaylist[];
}

export const GenreMixSection = memo(function GenreMixSection({ playlists }: GenreMixSectionProps) {
  const { t } = useTranslation();

  if (playlists.length === 0) return null;

  return (
    <PlaylistGrid
      title={t('home.genreMix')}
      playlists={playlists}
      showViewAll
      viewAllPath="/wave-mix"
    />
  );
});
