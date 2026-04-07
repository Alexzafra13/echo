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
} from '@shared/types/radio.types';

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

export interface RadioStationCardProps {
  station: RadioBrowserStation | RadioStation;
  isFavorite?: boolean;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

export interface RadioSearchProps {
  onSearch: (params: SearchStationsParams) => void;
  isLoading?: boolean;
}

export interface RadioBrowserProps {
  onStationSelect: (station: RadioBrowserStation) => void;
}

export interface FavoriteStationsProps {
  stations: RadioStation[];
  onPlay: (station: RadioStation) => void;
  onDelete: (stationId: string) => void;
  isLoading?: boolean;
}

export interface RadioPlayerState {
  isPlaying: boolean;
  currentStation: RadioStation | RadioBrowserStation | null;
  volume: number;
  isMuted: boolean;
}
