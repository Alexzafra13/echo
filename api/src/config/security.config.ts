// JWT secrets are managed by SecuritySecretsService (env > database > auto-generate)
// Do NOT read JWT_SECRET or JWT_REFRESH_SECRET from here
export const securityConfig = {
  jwt_expiration: '24h',
  jwt_refresh_expiration: '7d',
  bcrypt_rounds: 12,
};
