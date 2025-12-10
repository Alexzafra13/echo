import { Track } from '../entities/track.entity';

/**
 * ITrackRepository Port - Define contrato para acceder a tracks
 *
 * Esta es una INTERFAZ (contrato)
 * Define QUÉ métodos necesita el dominio, pero NO CÓMO se implementan
 *
 * Ventaja: El dominio no conoce Drizzle, MongoDB, etc
 * La implementación viene en Infrastructure Layer
 */
export interface ITrackRepository {
  /**
   * Busca un track por su ID
   * @param id - El ID (UUID) a buscar
   * @returns Track si existe, null si no
   */
  findById(id: string): Promise<Track | null>;

  /**
   * Busca múltiples tracks por sus IDs
   * @param ids - Array de IDs (UUIDs) a buscar
   * @returns Array de tracks encontrados
   */
  findByIds(ids: string[]): Promise<Track[]>;

  /**
   * Obtiene todos los tracks con paginación
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de tracks
   */
  findAll(skip: number, take: number): Promise<Track[]>;

  /**
   * Busca tracks por título (búsqueda parcial)
   * @param title - Título o parte del título a buscar
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de tracks que coinciden
   */
  search(title: string, skip: number, take: number): Promise<Track[]>;

  /**
   * Obtiene tracks de un álbum específico
   * @param albumId - ID del álbum
   * @param includeMissing - Incluir tracks con archivo desaparecido (default: true)
   * @returns Array de tracks del álbum ordenados por trackNumber
   */
  findByAlbumId(albumId: string, includeMissing?: boolean): Promise<Track[]>;

  /**
   * Obtiene tracks de un artista específico
   * @param artistId - ID del artista
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de tracks del artista
   */
  findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Track[]>;

  /**
   * Obtiene los tracks más reproducidos de un artista
   * @param artistId - ID del artista
   * @param limit - Número de tracks a retornar (default 5)
   * @returns Array de tracks ordenados por playCount DESC
   */
  findTopByArtistId(artistId: string, limit?: number): Promise<Track[]>;

  /**
   * Obtiene el total de tracks
   * @returns Número total de tracks
   */
  count(): Promise<number>;

  /**
   * Obtiene tracks en orden aleatorio determinístico con paginación
   * Usa un seed para garantizar orden consistente entre peticiones
   *
   * @param seed - Valor numérico para generar orden determinístico (0-1)
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de tracks en orden aleatorio reproducible
   */
  findShuffledPaginated(
    seed: number,
    skip: number,
    take: number,
  ): Promise<Track[]>;

  /**
   * Crea un nuevo track en la BD
   * @param track - La entidad Track a guardar
   * @returns El Track guardado (con datos de la BD)
   */
  create(track: Track): Promise<Track>;

  /**
   * Actualiza un track existente
   * @param id - ID del track
   * @param track - Los datos actualizados
   * @returns El Track actualizado
   */
  update(id: string, track: Partial<Track>): Promise<Track | null>;

  /**
   * Elimina un track
   * @param id - ID del track a eliminar
   * @returns true si se eliminó, false si no existía
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Constante con el nombre del provider
 * Se usa en NestJS para inyección de dependencias
 *
 * Uso:
 * @Inject(TRACK_REPOSITORY)
 * private readonly trackRepository: ITrackRepository
 */
export const TRACK_REPOSITORY = 'ITrackRepository';
