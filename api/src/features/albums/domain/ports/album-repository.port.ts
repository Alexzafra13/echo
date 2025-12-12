import { Album } from "../entities/album.entity";

/**
 * IAlbumRepository Port - Define contrato para acceder a álbumes
 *
 * Esta es una INTERFAZ (contrato)
 * Define QUÉ métodos necesita el dominio, pero NO CÓMO se implementan
 *
 * Ventaja: El dominio no conoce Drizzle, MongoDB, etc
 * La implementación viene en Infrastructure Layer
 */
export interface IAlbumRepository {
  /**
   * Busca un álbum por su ID
   * @param id - El ID (UUID) a buscar
   * @returns Album si existe, null si no
   */
  findById(id: string): Promise<Album | null>;

  /**
   * Obtiene todos los álbumes con paginación
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de álbumes
   */
  findAll(skip: number, take: number): Promise<Album[]>;

  /**
   * Busca álbumes por nombre (búsqueda parcial)
   * @param name - Nombre o parte del nombre a buscar
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de álbumes que coinciden
   */
  search(name: string, skip: number, take: number): Promise<Album[]>;

  /**
   * Obtiene álbumes de un artista específico
   * @param artistId - ID del artista
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de álbumes del artista
   */
  findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Album[]>;

  /**
   * Obtiene álbumes recientes
   * @param take - Cuántos registros traer
   * @returns Array de álbumes ordenados por fecha de creación descendente
   */
  findRecent(take: number): Promise<Album[]>;

  /**
   * Obtiene álbumes con más reproducciones
   * @param take - Cuántos registros traer
   * @returns Array de álbumes ordenados por popularidad
   */
  findMostPlayed(take: number): Promise<Album[]>;

  /**
   * Obtiene álbumes ordenados alfabéticamente
   * Ignora artículos ("The", "A", etc.) y acentos
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de álbumes ordenados por nombre
   */
  findAlphabetically(skip: number, take: number): Promise<Album[]>;

  /**
   * Obtiene álbumes ordenados por nombre de artista
   * Ignora artículos ("The", "A", etc.) y acentos en el nombre del artista
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de álbumes ordenados por nombre de artista, luego por nombre de álbum
   */
  findByArtistName(skip: number, take: number): Promise<Album[]>;

  /**
   * Obtiene álbumes reproducidos recientemente por un usuario
   * @param userId - ID del usuario
   * @param take - Cuántos registros traer
   * @returns Array de álbumes ordenados por última reproducción
   */
  findRecentlyPlayed(userId: string, take: number): Promise<Album[]>;

  /**
   * Obtiene álbumes marcados como favoritos por un usuario
   * @param userId - ID del usuario
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de álbumes favoritos ordenados por fecha de like
   */
  findFavorites(userId: string, skip: number, take: number): Promise<Album[]>;

  /**
   * Obtiene el total de álbumes
   * @returns Número total de álbumes
   */
  count(): Promise<number>;

  /**
   * Obtiene el total de álbumes de un artista específico
   * @param artistId - ID del artista
   * @returns Número total de álbumes del artista
   */
  countByArtistId(artistId: string): Promise<number>;

  /**
   * Crea un nuevo álbum en la BD
   * @param album - La entidad Album a guardar
   * @returns El Album guardado (con datos de la BD)
   */
  create(album: Album): Promise<Album>;

  /**
   * Actualiza un álbum existente
   * @param id - ID del álbum
   * @param album - Los datos actualizados
   * @returns El Album actualizado
   */
  update(id: string, album: Partial<Album>): Promise<Album | null>;

  /**
   * Elimina un álbum
   * @param id - ID del álbum a eliminar
   * @returns true si se eliminó, false si no existía
   */
  delete(id: string): Promise<boolean>;

  /**
   * Invalida los cachés de listas de álbumes
   * Este método es opcional - implementaciones sin caché pueden no hacer nada
   */
  invalidateListCaches?(): Promise<void>;
}

/**
 * Constante con el nombre del provider
 * Se usa en NestJS para inyección de dependencias
 *
 * Uso:
 * @Inject(ALBUM_REPOSITORY)
 * private readonly albumRepository: IAlbumRepository
 */
export const ALBUM_REPOSITORY = 'IAlbumRepository';