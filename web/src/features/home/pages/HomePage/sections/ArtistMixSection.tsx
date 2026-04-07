import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaylistGrid } from '../../../components';
import type { AutoPlaylist } from '@shared/services/recommendations.service';

interface ArtistMixSectionProps {
  playlists: AutoPlaylist[];
}

export const ArtistMixSection = memo(function ArtistMixSection({
  playlists,
}: ArtistMixSectionProps) {
  const { t } = useTranslation();

  if (playlists.length === 0) return null;

  return (
    <PlaylistGrid
      title={t('home.artistMix')}
      playlists={playlists}
      showViewAll
      viewAllPath="/wave-mix"
    />
  );
});
