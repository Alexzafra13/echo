import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ExternalApiError } from '@shared/errors';
import {
  IRadioBrowserApiClient,
  RadioBrowserStation,
  SearchStationsParams,
  RadioTag,
  RadioCountry,
} from '../../domain/ports';

// Keywords that indicate a TV station (not audio radio)
const TV_NAME_KEYWORDS = [
  'tv', 'television', 'televisión', 'televisio', 'télévision',
  'fernsehen', 'televisione', 'telewizja', 'televize',
];

const TV_TAG_KEYWORDS = [
  'tv', 'television', 'video', 'iptv', 'webtv',
];

const VIDEO_CODECS = [
  'h264', 'h.264', 'h265', 'h.265', 'hevc', 'vp8', 'vp9', 'av1',
  'mpeg4', 'mpeg-4', 'xvid', 'divx',
];

/**
 * Check if a station is likely a TV channel (video) rather than audio radio
 */
function isTvStation(station: RadioBrowserStation): boolean {
  const nameLower = station.name.toLowerCase();
  const tagsLower = station.tags?.toLowerCase() || '';
  const codecLower = station.codec?.toLowerCase() || '';

  // Check if name contains TV keywords as whole words
  for (const keyword of TV_NAME_KEYWORDS) {
    // Match as whole word (e.g., "TV" but not "native")
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(nameLower)) {
      return true;
    }
  }

  // Check if tags contain TV keywords
  for (const keyword of TV_TAG_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(tagsLower)) {
      return true;
    }
  }

  // Check if codec is a video codec
  for (const codec of VIDEO_CODECS) {
    if (codecLower.includes(codec)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter out TV stations from results, keeping only audio radio stations
 */
function filterTvStations(stations: RadioBrowserStation[]): RadioBrowserStation[] {
  return stations.filter(station => !isTvStation(station));
}

/**
 * Implementación del cliente de Radio Browser API
 * Usa fetch nativo de Node.js para las llamadas HTTP
 */
@Injectable()
export class RadioBrowserApiService implements IRadioBrowserApiClient {
  constructor(
    @InjectPinoLogger(RadioBrowserApiService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Servidores disponibles: de1, nl1, at1 - usar el que responda mejor
  private readonly BASE_URL = 'https://all.api.radio-browser.info';
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

      // Filter out TV stations (video streams) to keep only audio radio
      const audioStations = filterTvStations(stations);
      this.logger.debug(`Found ${stations.length} stations, ${audioStations.length} after filtering TV`);

      return audioStations;
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
  async getTags(limit: number = 100): Promise<RadioTag[]> {
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
  async getCountries(): Promise<RadioCountry[]> {
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

      this.logger.info(`Registered click for station ${stationUuid}`);
    } catch (error) {
      this.logger.error('Error registering click:', error);
      // No lanzamos error porque esto es opcional
    }
  }
}
