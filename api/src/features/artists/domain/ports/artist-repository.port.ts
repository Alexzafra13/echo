import { Artist } from '../entities/artist.entity';

/**
 * IArtistRepository - Port para acceso a datos de artistas
 *
 * Define el contrato que debe cumplir cualquier implementación
 * de repositorio de artistas (Drizzle, TypeORM, etc.)
 */
export interface IArtistRepository {
  /**
   * Busca un artista por su ID
   */
  findById(id: string): Promise<Artist | null>;

  /**
   * Busca múltiples artistas por sus IDs (bulk operation)
   */
  findByIds(ids: string[]): Promise<Artist[]>;

  /**
   * Busca un artista por nombre exacto (case-insensitive)
   */
  findByName(name: string): Promise<Artist | null>;

  /**
   * Busca múltiples artistas por nombres exactos (case-insensitive, bulk operation)
   * Returns a Map for O(1) lookup by lowercase name
   */
  findByNames(names: string[]): Promise<Map<string, Artist>>;

  /**
   * Obtiene todos los artistas con paginación
   */
  findAll(skip: number, take: number): Promise<Artist[]>;

  /**
   * Busca artistas por nombre (búsqueda parcial case-insensitive)
   */
  search(name: string, skip: number, take: number): Promise<Artist[]>;

  /**
   * Cuenta el total de artistas
   */
  count(): Promise<number>;

  /**
   * Crea un nuevo artista
   */
  create(artist: Artist): Promise<Artist>;

  /**
   * Actualiza un artista existente
   */
  update(id: string, artist: Partial<Artist>): Promise<Artist | null>;

  /**
   * Elimina un artista
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Token de inyección de dependencias
 */
export const ARTIST_REPOSITORY = 'IArtistRepository';
