import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { IRadioStationRepository, RADIO_STATION_REPOSITORY } from '../../ports/radio-station-repository.port';

interface DeleteFavoriteStationInput {
  stationId: string;
  userId: string;
}

/**
 * Use case: Eliminar una emisora favorita
 */
@Injectable()
export class DeleteFavoriteStationUseCase {
  constructor(
    @Inject(RADIO_STATION_REPOSITORY)
    private readonly repository: IRadioStationRepository,
  ) {}

  async execute(input: DeleteFavoriteStationInput): Promise<void> {
    const { stationId, userId } = input;

    // Verificar que la emisora existe
    const station = await this.repository.findById(stationId);

    if (!station) {
      throw new NotFoundError('Radio station', stationId);
    }

    // Verificar que pertenece al usuario
    if (station.userId !== userId) {
      throw new ForbiddenError('You can only delete your own favorite stations');
    }

    // Eliminar
    await this.repository.delete(stationId);
  }
}
