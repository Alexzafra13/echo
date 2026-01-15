/**
 * ITokenBlacklistService Port - Define contrato para gestionar tokens invalidados
 *
 * Cuando un usuario hace logout, su token se agrega a una blacklist.
 * Los tokens permanecen en la blacklist hasta que expiran naturalmente.
 */
export interface ITokenBlacklistService {
  /**
   * Agrega un token a la blacklist
   * @param tokenOrJti - El token JWT completo o su JTI (JWT ID)
   * @param expiresAt - Timestamp de expiración del token (para auto-limpieza)
   */
  add(tokenOrJti: string, expiresAt: number): Promise<void>;

  /**
   * Verifica si un token está en la blacklist
   * @param tokenOrJti - El token JWT completo o su JTI
   * @returns true si el token está blacklisteado (inválido)
   */
  isBlacklisted(tokenOrJti: string): Promise<boolean>;
}

/**
 * Constante con el nombre del provider
 * Se usa en NestJS para inyección de dependencias
 */
export const TOKEN_BLACKLIST_SERVICE = 'ITokenBlacklistService';
