import { RadioStation } from '../entities/radio-station.entity';

/**
 * Port (interfaz) del repositorio de RadioStation
 * Define los métodos que debe implementar cualquier repositorio de radio
 */
export interface IRadioStationRepository {
  /**
   * Guardar/actualizar una emisora favorita
   */
  save(station: RadioStation): Promise<RadioStation>;

  /**
   * Buscar emisora por ID
   */
  findById(id: string): Promise<RadioStation | null>;

  /**
   * Buscar emisora por UUID de Radio Browser
   */
  findByStationUuid(userId: string, stationUuid: string): Promise<RadioStation | null>;

  /**
   * Obtener todas las emisoras favoritas de un usuario
   */
  findByUserId(userId: string): Promise<RadioStation[]>;

  /**
   * Eliminar una emisora favorita
   */
  delete(id: string): Promise<void>;

  /**
   * Contar emisoras favoritas de un usuario
   */
  countByUserId(userId: string): Promise<number>;
}

/**
 * Constante con el nombre del provider
 * Se usa en NestJS para inyección de dependencias
 */
export const RADIO_STATION_REPOSITORY = 'IRadioStationRepository';
