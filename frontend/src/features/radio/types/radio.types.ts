/**
 * Radio station source type
 */
export type RadioSource = 'radio-browser' | 'custom';

/**
 * Radio station entity from our backend
 */
export interface RadioStation {
  id: string;
  userId: string;
  stationUuid: string | null;
  name: string;
  url: string;
  urlResolved: string | null;
  homepage: string | null;
  favicon: string | null;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  language: string | null;
  tags: string | null;
  codec: string | null;
  bitrate: number | null;
  votes: number | null;
  clickCount: number | null;
  lastCheckOk: boolean | null;
  source: RadioSource;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Radio Browser API station response
 */
export interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  languagecodes: string;
  votes: number;
  lastchangetime: string;
  lastchangetime_iso8601: string;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  lastchecktime: string;
  lastchecktime_iso8601: string;
  lastcheckoktime: string;
  lastcheckoktime_iso8601: string;
  lastlocalchecktime: string;
  lastlocalchecktime_iso8601: string;
  clicktimestamp: string;
  clicktimestamp_iso8601: string;
  clickcount: number;
  clicktrend: number;
  ssl_error: number;
  geo_lat: number | null;
  geo_long: number | null;
  has_extended_info: boolean;
}

/**
 * Search parameters for Radio Browser API
 */
export interface SearchStationsParams {
  name?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  tag?: string;
  tagList?: string;
  codec?: string;
  bitrateMin?: number;
  bitrateMax?: number;
  hasGeoInfo?: boolean;
  order?: 'name' | 'url' | 'homepage' | 'favicon' | 'tags' | 'country' | 'state' | 'language' | 'votes' | 'codec' | 'bitrate' | 'lastcheckok' | 'lastchecktime' | 'clicktimestamp' | 'clickcount' | 'clicktrend' | 'random';
  reverse?: boolean;
  offset?: number;
  limit?: number;
  hidebroken?: boolean;
}

/**
 * Radio Browser API tag response
 */
export interface RadioBrowserTag {
  name: string;
  stationcount: number;
}

/**
 * Radio Browser API country response
 */
export interface RadioBrowserCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

/**
 * DTO for saving a station from Radio Browser API
 */
export interface SaveApiStationDto {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  tags?: string;
  codec?: string;
  bitrate?: number;
  votes?: number;
  clickcount?: number;
  lastcheckok?: boolean;
}

/**
 * DTO for creating a custom radio station
 */
export interface CreateCustomStationDto {
  name: string;
  url: string;
  homepage?: string;
  favicon?: string;
  country?: string;
  tags?: string;
  codec?: string;
  bitrate?: number;
}

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
