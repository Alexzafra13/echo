import { User } from '../entities/user.entity';

export interface UserUpdateableFields {
  name?: string;
  email?: string;
  theme?: string;
  language?: string;
  lastLoginAt?: Date;
  lastAccessAt?: Date;
}

/**
 * IUserRepository - Contrato de persistencia
 * 
 * Responsabilidad: SOLO acceso a datos
 * NO contiene lógica de negocio
 */
export interface IUserRepository {
  /**
   * Busca usuario por ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Busca usuario por username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Busca usuario por email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Crea un nuevo usuario
   */
  create(user: User): Promise<User>;

  /**
   * Actualiza campos específicos de un usuario
   * SOLO actualiza los campos proporcionados en 'data'
   * 
   * @param id - ID del usuario
   * @param data - Campos a actualizar (parcial)
   * @returns Usuario actualizado completo
   */
  updatePartial(id: string, data: Partial<UserUpdateableFields>): Promise<User>;

  /**
   * Actualiza la contraseña de un usuario
   * Método separado porque requiere validaciones especiales
   */
  updatePassword(userId: string, newPasswordHash: string): Promise<void>;

  /**
   * Cambia el estado de admin de un usuario
   * Método separado porque es una operación sensible
   */
  updateAdminStatus(userId: string, isAdmin: boolean): Promise<void>;
}

export const USER_REPOSITORY = 'IUserRepository';