// JWT y bcrypt. Los secretos se auto-generan en Docker si no existen.
export const securityConfig = {
  jwt_secret: process.env.JWT_SECRET,
  jwt_expiration: process.env.JWT_EXPIRATION || '24h',
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_refresh_expiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  bcrypt_rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
};