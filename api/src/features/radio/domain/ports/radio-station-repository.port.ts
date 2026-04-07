import { RadioStation } from '../entities/radio-station.entity';

export interface IRadioStationRepository {
  save(station: RadioStation): Promise<RadioStation>;
  findById(id: string): Promise<RadioStation | null>;
  findByStationUuid(userId: string, stationUuid: string): Promise<RadioStation | null>;
  findByUserId(userId: string): Promise<RadioStation[]>;
  delete(id: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
}

export const RADIO_STATION_REPOSITORY = 'IRadioStationRepository';
