export interface LogoutInput {
  /** El token JWT completo que se va a invalidar */
  token: string;

  /** ID del usuario que hace logout */
  userId: string;

  /** Username del usuario (para logging) */
  username: string;

  /** Timestamp de expiración del token (para TTL en blacklist) */
  tokenExp: number;
}
