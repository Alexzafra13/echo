import { User } from '../entities/user.entity';

/**
 * IUserRepository Port - Define contrato para acceder a usuarios
 *
 * Esta es una INTERFAZ (contrato)
 * Define QUÉ métodos necesita el dominio, pero NO CÓMO se implementan
 *
 * Ventaja: El dominio no conoce Prisma, MongoDB, etc
 * La implementación viene en Infrastructure Layer
 *
 * Métodos:
 * - findByUsername: Buscar user por username
 * - findByEmail: Buscar user por email
 * - findById: Buscar user por ID
 * - create: Crear nuevo user
 */
export interface IUserRepository {
  /**
   * Busca un usuario por su username
   * @param username - El username a buscar
   * @returns User si existe, null si no
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Busca un usuario por su email
   * @param email - El email a buscar
   * @returns User si existe, null si no
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Busca un usuario por su ID
   * @param id - El ID (UUID) a buscar
   * @returns User si existe, null si no
   */
  findById(id: string): Promise<User | null>;

  /**
   * Crea un nuevo usuario en la BD
   * @param user - La entidad User a guardar
   * @returns El User guardado (con datos de la BD)
   */
  create(user: User): Promise<User>;
}

/**
 * Constante con el nombre del provider
 * Se usa en NestJS para inyección de dependencias
 * 
 * Uso:
 * @Inject(USER_REPOSITORY)
 * private readonly userRepository: IUserRepository
 */
export const USER_REPOSITORY = 'IUserRepository';