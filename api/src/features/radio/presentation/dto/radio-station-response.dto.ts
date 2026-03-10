import { RadioStation } from '../../domain/entities/radio-station.entity';

/**
 * DTO de respuesta para RadioStation
 */
export class RadioStationResponseDto {
  id!: string;
  stationUuid?: string;
  name!: string;
  url!: string;
  urlResolved?: string;
  homepage?: string;
  favicon?: string;
  customFaviconUrl?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  language?: string;
  tags?: string[];
  codec?: string;
  bitrate?: number;
  votes?: number;
  clickCount?: number;
  lastCheckOk?: boolean;
  source!: 'radio-browser' | 'custom';
  isFavorite!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(
    station: RadioStation,
    customFaviconUrl?: string,
  ): RadioStationResponseDto {
    return {
      id: station.id,
      stationUuid: station.stationUuid,
      name: station.name,
      url: station.url,
      urlResolved: station.urlResolved,
      homepage: station.homepage,
      favicon: station.favicon,
      customFaviconUrl,
      country: station.country,
      countryCode: station.countryCode,
      state: station.state,
      language: station.language,
      tags: station.getTagsArray(),
      codec: station.codec,
      bitrate: station.bitrate,
      votes: station.votes,
      clickCount: station.clickCount,
      lastCheckOk: station.lastCheckOk,
      source: station.source,
      isFavorite: station.isFavorite,
      createdAt: station.createdAt,
      updatedAt: station.updatedAt,
    };
  }

  static fromDomainArray(
    stations: RadioStation[],
    customFaviconMap?: Map<string, string>,
  ): RadioStationResponseDto[] {
    return stations.map((station) => {
      const customUrl = station.stationUuid && customFaviconMap
        ? customFaviconMap.get(station.stationUuid)
        : undefined;
      return this.fromDomain(station, customUrl);
    });
  }
}
