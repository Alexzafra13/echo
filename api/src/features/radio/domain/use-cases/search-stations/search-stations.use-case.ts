import { Injectable, Inject } from '@nestjs/common';
import {
  IRadioBrowserApiClient,
  RADIO_BROWSER_API_CLIENT,
  SearchStationsParams,
  RadioBrowserStation,
  RadioTag,
  RadioCountry,
} from '../../ports';

/**
 * Use case: Buscar emisoras en Radio Browser API
 */
@Injectable()
export class SearchStationsUseCase {
  constructor(
    @Inject(RADIO_BROWSER_API_CLIENT)
    private readonly radioBrowserApi: IRadioBrowserApiClient,
  ) {}

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

  async getTags(limit: number = 100): Promise<RadioTag[]> {
    return this.radioBrowserApi.getTags(limit);
  }

  async getCountries(): Promise<RadioCountry[]> {
    return this.radioBrowserApi.getCountries();
  }
}
