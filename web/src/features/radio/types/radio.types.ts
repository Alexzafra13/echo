/**
 * Radio Types - Re-export shared radio types and add component props
 */

import type {
  RadioSource,
  RadioStation,
  RadioMetadata,
  RadioBrowserStation,
  SearchStationsParams,
  RadioBrowserTag,
  RadioBrowserCountry,
  SaveApiStationDto,
  CreateCustomStationDto,
} from '@shared/types';

// Re-export for external use
export type {
  RadioSource,
  RadioStation,
  RadioMetadata,
  RadioBrowserStation,
  SearchStationsParams,
  RadioBrowserTag,
  RadioBrowserCountry,
  SaveApiStationDto,
  CreateCustomStationDto,
};

/**
 * Props for RadioStationCard component
 */
export interface RadioStationCardProps {
  station: RadioBrowserStation | RadioStation;
  isFavorite?: boolean;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

/**
 * Props for RadioSearch component
 */
export interface RadioSearchProps {
  onSearch: (params: SearchStationsParams) => void;
  isLoading?: boolean;
}

/**
 * Props for RadioBrowser component
 */
export interface RadioBrowserProps {
  onStationSelect: (station: RadioBrowserStation) => void;
}

/**
 * Props for FavoriteStations component
 */
export interface FavoriteStationsProps {
  stations: RadioStation[];
  onPlay: (station: RadioStation) => void;
  onDelete: (stationId: string) => void;
  isLoading?: boolean;
}

/**
 * Radio player state
 */
export interface RadioPlayerState {
  isPlaying: boolean;
  currentStation: RadioStation | RadioBrowserStation | null;
  volume: number;
  isMuted: boolean;
}
