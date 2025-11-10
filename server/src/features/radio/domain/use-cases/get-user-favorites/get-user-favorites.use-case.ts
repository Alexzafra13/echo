import { Injectable, Inject } from '@nestjs/common';
import { IRadioStationRepository, RADIO_STATION_REPOSITORY } from '../../ports/radio-station-repository.port';
import { RadioStation } from '../../entities/radio-station.entity';

/**
 * Use case: Obtener todas las emisoras favoritas de un usuario
 */
@Injectable()
export class GetUserFavoritesUseCase {
  constructor(
    @Inject(RADIO_STATION_REPOSITORY)
    private readonly repository: IRadioStationRepository,
  ) {}

  async execute(userId: string): Promise<RadioStation[]> {
    return this.repository.findByUserId(userId);
  }
}
