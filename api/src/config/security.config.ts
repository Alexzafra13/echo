/**
 * Security Configuration
 *
 * JWT secrets are auto-generated if not provided.
 * Other security settings use sensible defaults.
 */
export const securityConfig = {
  jwt_secret: process.env.JWT_SECRET,
  jwt_expiration: '24h',
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_refresh_expiration: '7d',
  bcrypt_rounds: 12,
};
