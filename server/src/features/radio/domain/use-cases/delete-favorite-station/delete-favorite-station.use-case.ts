import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IRadioStationRepository } from '../../ports/radio-station-repository.port';

interface DeleteFavoriteStationInput {
  stationId: string;
  userId: string;
}

/**
 * Use case: Eliminar una emisora favorita
 */
@Injectable()
export class DeleteFavoriteStationUseCase {
  constructor(private readonly repository: IRadioStationRepository) {}

  async execute(input: DeleteFavoriteStationInput): Promise<void> {
    const { stationId, userId } = input;

    // Verificar que la emisora existe
    const station = await this.repository.findById(stationId);

    if (!station) {
      throw new NotFoundException(`Radio station with id ${stationId} not found`);
    }

    // Verificar que pertenece al usuario
    if (station.userId !== userId) {
      throw new ForbiddenException('You can only delete your own favorite stations');
    }

    // Eliminar
    await this.repository.delete(stationId);
  }
}
