/**
 * Configuración de seguridad
 *
 * Maneja JWT tokens y hashing de contraseñas.
 * Los secretos JWT se auto-generan en Docker si no se proporcionan.
 *
 * Variables de entorno:
 * - JWT_SECRET: Secreto para access tokens (mín. 32 caracteres)
 * - JWT_REFRESH_SECRET: Secreto para refresh tokens (mín. 32 caracteres)
 * - JWT_EXPIRATION: Tiempo de vida del access token (default: 24h)
 * - JWT_REFRESH_EXPIRATION: Tiempo de vida del refresh token (default: 7d)
 * - BCRYPT_ROUNDS: Rondas de bcrypt para hashing (default: 12)
 */
export const securityConfig = {
  jwt_secret: process.env.JWT_SECRET,
  jwt_expiration: process.env.JWT_EXPIRATION || '24h',
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_refresh_expiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  bcrypt_rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
};