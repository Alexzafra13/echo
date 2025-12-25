/**
 * Interfaz que representa una estación de radio de la API externa
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

/**
 * Parámetros de búsqueda para estaciones
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
  order?: 'name' | 'url' | 'homepage' | 'favicon' | 'tags' | 'country' | 'state' |
         'language' | 'votes' | 'codec' | 'bitrate' | 'lastcheckok' | 'lastchecktime' |
         'clicktimestamp' | 'clickcount' | 'clicktrend' | 'changetimestamp' | 'random';
  reverse?: boolean;
  offset?: number;
  limit?: number;
  hidebroken?: boolean;
  removeDuplicates?: boolean;
}

/**
 * Tag de radio
 */
export interface RadioTag {
  name: string;
  stationcount: number;
}

/**
 * País de radio
 */
export interface RadioCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

/**
 * Port (interfaz) del servicio de Radio Browser API
 * Define los métodos que debe implementar cualquier cliente de la API
 */
export interface IRadioBrowserApiClient {
  /**
   * Buscar estaciones de radio
   */
  searchStations(params: SearchStationsParams): Promise<RadioBrowserStation[]>;

  /**
   * Obtener estaciones por votos (top voted)
   */
  getTopVotedStations(limit?: number): Promise<RadioBrowserStation[]>;

  /**
   * Obtener estaciones populares por clicks
   */
  getPopularStations(limit?: number): Promise<RadioBrowserStation[]>;

  /**
   * Obtener estaciones por país
   */
  getStationsByCountry(countryCode: string, limit?: number): Promise<RadioBrowserStation[]>;

  /**
   * Obtener estaciones por género/tag
   */
  getStationsByTag(tag: string, limit?: number): Promise<RadioBrowserStation[]>;

  /**
   * Buscar estaciones por nombre
   */
  searchByName(name: string, limit?: number): Promise<RadioBrowserStation[]>;

  /**
   * Obtener todos los tags/géneros disponibles
   */
  getTags(limit?: number): Promise<RadioTag[]>;

  /**
   * Obtener todos los países disponibles
   */
  getCountries(): Promise<RadioCountry[]>;

  /**
   * Registrar click en una estación
   */
  registerStationClick(stationUuid: string): Promise<void>;
}

/**
 * Token de inyección de dependencias
 */
export const RADIO_BROWSER_API_CLIENT = 'IRadioBrowserApiClient';
