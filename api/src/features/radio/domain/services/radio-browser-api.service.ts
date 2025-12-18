import { Injectable, Logger } from '@nestjs/common';
import { ExternalApiError } from '@shared/errors';

/**
 * Interfaz que representa una estación de radio de la API
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
 * Servicio nativo para interactuar con Radio Browser API
 * No usa librerías externas, solo fetch nativo de Node.js
 */
@Injectable()
export class RadioBrowserApiService {
  private readonly logger = new Logger(RadioBrowserApiService.name);
  private readonly BASE_URL = 'https://de1.api.radio-browser.info'; // Servidor alemán
  private readonly USER_AGENT = 'Echo-Music-Server/1.0';

  /**
   * Buscar estaciones de radio
   */
  async searchStations(params: SearchStationsParams): Promise<RadioBrowserStation[]> {
    try {
      const queryParams = new URLSearchParams();

      // Agregar parámetros de búsqueda
      if (params.name) queryParams.append('name', params.name);
      if (params.country) queryParams.append('country', params.country);
      if (params.countrycode) queryParams.append('countrycode', params.countrycode);
      if (params.state) queryParams.append('state', params.state);
      if (params.language) queryParams.append('language', params.language);
      if (params.tag) queryParams.append('tag', params.tag);
      if (params.tagList) queryParams.append('tagList', params.tagList);
      if (params.codec) queryParams.append('codec', params.codec);
      if (params.bitrateMin) queryParams.append('bitrateMin', params.bitrateMin.toString());
      if (params.bitrateMax) queryParams.append('bitrateMax', params.bitrateMax.toString());
      if (params.order) queryParams.append('order', params.order);
      if (params.reverse !== undefined) queryParams.append('reverse', params.reverse.toString());
      if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params.hidebroken !== undefined) queryParams.append('hidebroken', params.hidebroken.toString());
      if (params.removeDuplicates !== undefined) queryParams.append('removeDuplicates', params.removeDuplicates.toString());

      const url = `${this.BASE_URL}/json/stations/search?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new ExternalApiError('RadioBrowser', response.status, response.statusText);
      }

      const stations: RadioBrowserStation[] = await response.json();
      this.logger.debug(`Found ${stations.length} stations`);

      return stations;
    } catch (error) {
      this.logger.error('Error searching stations:', error);
      throw error;
    }
  }

  /**
   * Obtener estaciones por votos (top voted)
   * Prioriza bitrate para mejor calidad, luego filtra duplicados
   */
  async getTopVotedStations(limit: number = 20): Promise<RadioBrowserStation[]> {
    return this.searchStations({
      order: 'bitrate',
      reverse: true,
      limit,
      hidebroken: true,
      removeDuplicates: true,
    });
  }

  /**
   * Obtener estaciones populares por clicks
   * Prioriza bitrate para mejor calidad, luego filtra duplicados
   */
  async getPopularStations(limit: number = 20): Promise<RadioBrowserStation[]> {
    return this.searchStations({
      order: 'bitrate',
      reverse: true,
      limit,
      hidebroken: true,
      removeDuplicates: true,
    });
  }

  /**
   * Obtener estaciones por país
   * Prioriza bitrate para mejor calidad, luego filtra duplicados
   */
  async getStationsByCountry(countryCode: string, limit: number = 50): Promise<RadioBrowserStation[]> {
    return this.searchStations({
      countrycode: countryCode,
      order: 'bitrate',
      reverse: true,
      limit,
      hidebroken: true,
      removeDuplicates: true,
    });
  }

  /**
   * Obtener estaciones por género/tag
   * Prioriza bitrate para mejor calidad, luego filtra duplicados
   */
  async getStationsByTag(tag: string, limit: number = 50): Promise<RadioBrowserStation[]> {
    return this.searchStations({
      tag,
      order: 'bitrate',
      reverse: true,
      limit,
      hidebroken: true,
      removeDuplicates: true,
    });
  }

  /**
   * Buscar estaciones por nombre
   * Prioriza bitrate para mejor calidad, luego filtra duplicados
   */
  async searchByName(name: string, limit: number = 20): Promise<RadioBrowserStation[]> {
    return this.searchStations({
      name,
      order: 'bitrate',
      reverse: true,
      limit,
      hidebroken: true,
      removeDuplicates: true,
    });
  }

  /**
   * Obtener todos los tags/géneros disponibles
   */
  async getTags(limit: number = 100): Promise<Array<{ name: string; stationcount: number }>> {
    try {
      const url = `${this.BASE_URL}/json/tags?limit=${limit}&order=stationcount&reverse=true`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new ExternalApiError('RadioBrowser', response.status, response.statusText);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching tags:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los países disponibles
   */
  async getCountries(): Promise<Array<{ name: string; iso_3166_1: string; stationcount: number }>> {
    try {
      const url = `${this.BASE_URL}/json/countries?order=stationcount&reverse=true`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new ExternalApiError('RadioBrowser', response.status, response.statusText);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching countries:', error);
      throw error;
    }
  }

  /**
   * Registrar click en una estación (incrementa contador de popularidad)
   */
  async registerStationClick(stationUuid: string): Promise<void> {
    try {
      const url = `${this.BASE_URL}/json/url/${stationUuid}`;

      await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      this.logger.log(`Registered click for station ${stationUuid}`);
    } catch (error) {
      this.logger.error('Error registering click:', error);
      // No lanzamos error porque esto es opcional
    }
  }
}
