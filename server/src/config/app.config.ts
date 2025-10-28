export const appConfig = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  api_prefix: process.env.API_PREFIX || 'api',
  cors_origins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
};