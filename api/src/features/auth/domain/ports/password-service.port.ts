/**
 * IPasswordService - Contrato para hashear y comparar contraseñas
 * NO implementa (eso va en Infrastructure con bcrypt)
 */
export interface IPasswordService {
  /**
   * Hashea una contraseña
   * @param password - Contraseña en texto plano
   * @returns Hash bcrypt
   */
  hash(password: string): Promise<string>;

  /**
   * Compara contraseña con hash
   * @param password - Contraseña en texto plano
   * @param hash - Hash guardado en BD
   * @returns true si coinciden, false si no
   */
  compare(password: string, hash: string): Promise<boolean>;
}

export const PASSWORD_SERVICE = 'IPasswordService';