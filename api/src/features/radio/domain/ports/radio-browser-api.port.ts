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
  codec: string;
  bitrate: number;
  hls: boolean;
  lastcheckok: boolean;
  lastchecktime: string;
  clickcount: number;
  clicktrend: number;
  geo_lat: number;
  geo_long: number;
}

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
  order?: 'name' | 'url' | 'homepage' | 'favicon' | 'tags' | 'country' | 'state' |
         'language' | 'votes' | 'codec' | 'bitrate' | 'lastcheckok' | 'lastchecktime' |
         'clicktimestamp' | 'clickcount' | 'clicktrend' | 'changetimestamp' | 'random';
  reverse?: boolean;
  offset?: number;
  limit?: number;
  hidebroken?: boolean;
  removeDuplicates?: boolean;
}

export interface RadioTag {
  name: string;
  stationcount: number;
}

export interface RadioCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

export interface IRadioBrowserApiClient {
  searchStations(params: SearchStationsParams): Promise<RadioBrowserStation[]>;
  getTopVotedStations(limit?: number): Promise<RadioBrowserStation[]>;
  getPopularStations(limit?: number): Promise<RadioBrowserStation[]>;
  getStationsByCountry(countryCode: string, limit?: number): Promise<RadioBrowserStation[]>;
  getStationsByTag(tag: string, limit?: number): Promise<RadioBrowserStation[]>;
  searchByName(name: string, limit?: number): Promise<RadioBrowserStation[]>;
  getTags(limit?: number): Promise<RadioTag[]>;
  getCountries(): Promise<RadioCountry[]>;
  registerStationClick(stationUuid: string): Promise<void>;
}

export const RADIO_BROWSER_API_CLIENT = 'IRadioBrowserApiClient';
