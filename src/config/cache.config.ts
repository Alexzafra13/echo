export const cacheConfig = {
  redis_host: process.env.REDIS_HOST || 'localhost',
  redis_port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redis_password: process.env.REDIS_PASSWORD || undefined,
};