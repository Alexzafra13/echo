import { LibraryScan } from '../entities/library-scan.entity';

/**
 * IScannerRepository Port - Define contrato para acceder a escaneos
 *
 * Esta es una INTERFAZ (contrato)
 * Define QUÉ métodos necesita el dominio, pero NO CÓMO se implementan
 *
 * Ventaja: El dominio no conoce Drizzle, MongoDB, etc
 * La implementación viene en Infrastructure Layer
 */
export interface IScannerRepository {
  /**
   * Busca un escaneo por su ID
   * @param id - El ID (UUID) del escaneo
   * @returns LibraryScan si existe, null si no
   */
  findById(id: string): Promise<LibraryScan | null>;

  /**
   * Obtiene todos los escaneos con paginación
   * @param skip - Cuántos registros saltar
   * @param take - Cuántos registros traer
   * @returns Array de escaneos ordenados por fecha descendente
   */
  findAll(skip: number, take: number): Promise<LibraryScan[]>;

  /**
   * Obtiene el escaneo más reciente
   * @returns El último escaneo o null si no hay ninguno
   */
  findLatest(): Promise<LibraryScan | null>;

  /**
   * Obtiene escaneos por estado
   * @param status - Estado del escaneo
   * @returns Array de escaneos con ese estado
   */
  findByStatus(status: string): Promise<LibraryScan[]>;

  /**
   * Crea un nuevo escaneo
   * @param scan - La entidad LibraryScan a guardar
   * @returns El LibraryScan guardado
   */
  create(scan: LibraryScan): Promise<LibraryScan>;

  /**
   * Actualiza un escaneo existente
   * @param id - ID del escaneo
   * @param data - Datos a actualizar
   * @returns El escaneo actualizado o null si no existe
   */
  update(id: string, data: Partial<LibraryScan>): Promise<LibraryScan | null>;

  /**
   * Cuenta el total de escaneos
   * @returns Número total de escaneos
   */
  count(): Promise<number>;
}

/**
 * Constante con el nombre del provider
 * Se usa en NestJS para inyección de dependencias
 */
export const SCANNER_REPOSITORY = 'IScannerRepository';
