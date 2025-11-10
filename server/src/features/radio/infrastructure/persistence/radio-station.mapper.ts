import { RadioStation } from '../../domain/entities/radio-station.entity';

/**
 * RadioStationMapper - Convierte entre capas
 *
 * Prisma RadioStation ↔ Domain RadioStation
 */
export class RadioStationMapper {
  /**
   * Convierte Prisma RadioStation a Domain RadioStation
   */
  static toDomain(raw: any): RadioStation {
    return RadioStation.reconstruct({
      id: raw.id,
      userId: raw.userId,
      stationUuid: raw.stationUuid || undefined,
      name: raw.name,
      url: raw.url,
      urlResolved: raw.urlResolved || undefined,
      homepage: raw.homepage || undefined,
      favicon: raw.favicon || undefined,
      country: raw.country || undefined,
      countryCode: raw.countryCode || undefined,
      state: raw.state || undefined,
      language: raw.language || undefined,
      tags: raw.tags || undefined,
      codec: raw.codec || undefined,
      bitrate: raw.bitrate || undefined,
      votes: raw.votes || undefined,
      clickCount: raw.clickCount || undefined,
      lastCheckOk: raw.lastCheckOk ?? undefined,
      source: raw.source as 'radio-browser' | 'custom',
      isFavorite: raw.isFavorite,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convierte Domain RadioStation a formato Prisma
   */
  static toPersistence(station: RadioStation) {
    const primitives = station.toPrimitives();
    return {
      id: primitives.id,
      userId: primitives.userId,
      stationUuid: primitives.stationUuid || null,
      name: primitives.name,
      url: primitives.url,
      urlResolved: primitives.urlResolved || null,
      homepage: primitives.homepage || null,
      favicon: primitives.favicon || null,
      country: primitives.country || null,
      countryCode: primitives.countryCode || null,
      state: primitives.state || null,
      language: primitives.language || null,
      tags: primitives.tags || null,
      codec: primitives.codec || null,
      bitrate: primitives.bitrate || null,
      votes: primitives.votes || null,
      clickCount: primitives.clickCount || null,
      lastCheckOk: primitives.lastCheckOk ?? null,
      source: primitives.source,
      isFavorite: primitives.isFavorite,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  /**
   * Convierte Array de Prisma RadioStations a Domain RadioStations
   */
  static toDomainArray(raw: any[]): RadioStation[] {
    return raw.map((station) => this.toDomain(station));
  }
}
