import { Injectable } from '@nestjs/common';
import { IRadioStationRepository } from '../../ports/radio-station-repository.port';
import { RadioStation } from '../../entities/radio-station.entity';
import { RadioBrowserApiService } from '../../services/radio-browser-api.service';

interface SaveFavoriteStationInput {
  userId: string;
  stationData: {
    stationuuid?: string;
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
  };
  isCustom?: boolean;
}

/**
 * Use case: Guardar una emisora como favorita
 */
@Injectable()
export class SaveFavoriteStationUseCase {
  constructor(
    private readonly repository: IRadioStationRepository,
    private readonly radioBrowserApi: RadioBrowserApiService,
  ) {}

  async execute(input: SaveFavoriteStationInput): Promise<RadioStation> {
    const { userId, stationData, isCustom } = input;

    // Si no es custom y tiene UUID, verificar si ya existe en favoritos
    if (!isCustom && stationData.stationuuid) {
      const existing = await this.repository.findByStationUuid(
        userId,
        stationData.stationuuid,
      );

      if (existing) {
        // Ya está en favoritos, retornar la existente
        return existing;
      }

      // Registrar click en Radio Browser API
      await this.radioBrowserApi.registerStationClick(stationData.stationuuid);
    }

    // Crear nueva emisora
    const station = isCustom
      ? RadioStation.createCustom({
          userId,
          name: stationData.name,
          url: stationData.url,
          urlResolved: stationData.url_resolved,
          homepage: stationData.homepage,
          favicon: stationData.favicon,
          country: stationData.country,
          countryCode: stationData.countrycode,
          state: stationData.state,
          language: stationData.language,
          tags: stationData.tags,
          codec: stationData.codec,
          bitrate: stationData.bitrate,
          votes: stationData.votes,
          clickCount: stationData.clickcount,
          lastCheckOk: stationData.lastcheckok,
        })
      : RadioStation.createFromAPI(userId, stationData as any);

    // Guardar en BD
    return this.repository.save(station);
  }
}
