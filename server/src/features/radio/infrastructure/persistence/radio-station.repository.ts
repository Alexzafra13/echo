import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { RadioStation } from '../../domain/entities/radio-station.entity';
import { IRadioStationRepository } from '../../domain/ports/radio-station-repository.port';
import { RadioStationMapper } from './radio-station.mapper';

/**
 * PrismaRadioStationRepository - Implementación de IRadioStationRepository con Prisma
 */
@Injectable()
export class PrismaRadioStationRepository implements IRadioStationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guardar o actualizar una emisora favorita
   */
  async save(station: RadioStation): Promise<RadioStation> {
    const data = RadioStationMapper.toPersistence(station);

    // Separate userId from data for proper Prisma relation handling
    const { userId, ...stationData } = data;

    const savedStation = await this.prisma.radioStation.upsert({
      where: { id: data.id },
      create: {
        ...stationData,
        user: {
          connect: { id: userId },
        },
      },
      update: stationData,
    });

    return RadioStationMapper.toDomain(savedStation);
  }

  /**
   * Buscar emisora por ID
   */
  async findById(id: string): Promise<RadioStation | null> {
    const station = await this.prisma.radioStation.findUnique({
      where: { id },
    });

    return station ? RadioStationMapper.toDomain(station) : null;
  }

  /**
   * Buscar emisora por UUID de Radio Browser
   */
  async findByStationUuid(
    userId: string,
    stationUuid: string,
  ): Promise<RadioStation | null> {
    const station = await this.prisma.radioStation.findFirst({
      where: {
        userId,
        stationUuid,
      },
    });

    return station ? RadioStationMapper.toDomain(station) : null;
  }

  /**
   * Obtener todas las emisoras favoritas de un usuario
   */
  async findByUserId(userId: string): Promise<RadioStation[]> {
    const stations = await this.prisma.radioStation.findMany({
      where: {
        userId,
        isFavorite: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return RadioStationMapper.toDomainArray(stations);
  }

  /**
   * Eliminar una emisora favorita
   */
  async delete(id: string): Promise<void> {
    await this.prisma.radioStation.delete({
      where: { id },
    });
  }

  /**
   * Contar emisoras favoritas de un usuario
   */
  async countByUserId(userId: string): Promise<number> {
    return this.prisma.radioStation.count({
      where: {
        userId,
        isFavorite: true,
      },
    });
  }
}
