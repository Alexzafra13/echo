import { Injectable } from '@nestjs/common';
import { RadioBrowserApiService, SearchStationsParams, RadioBrowserStation } from '../../services/radio-browser-api.service';

/**
 * Use case: Buscar emisoras en Radio Browser API
 */
@Injectable()
export class SearchStationsUseCase {
  constructor(private readonly radioBrowserApi: RadioBrowserApiService) {}

  async execute(params: SearchStationsParams): Promise<RadioBrowserStation[]> {
    return this.radioBrowserApi.searchStations(params);
  }

  async getTopVoted(limit: number = 20): Promise<RadioBrowserStation[]> {
    return this.radioBrowserApi.getTopVotedStations(limit);
  }

  async getPopular(limit: number = 20): Promise<RadioBrowserStation[]> {
    return this.radioBrowserApi.getPopularStations(limit);
  }

  async getByCountry(countryCode: string, limit: number = 50): Promise<RadioBrowserStation[]> {
    return this.radioBrowserApi.getStationsByCountry(countryCode, limit);
  }

  async getByTag(tag: string, limit: number = 50): Promise<RadioBrowserStation[]> {
    return this.radioBrowserApi.getStationsByTag(tag, limit);
  }

  async searchByName(name: string, limit: number = 20): Promise<RadioBrowserStation[]> {
    return this.radioBrowserApi.searchByName(name, limit);
  }

  async getTags(limit: number = 100): Promise<Array<{ name: string; stationcount: number }>> {
    return this.radioBrowserApi.getTags(limit);
  }

  async getCountries(): Promise<Array<{ name: string; iso_3166_1: string; stationcount: number }>> {
    return this.radioBrowserApi.getCountries();
  }
}
