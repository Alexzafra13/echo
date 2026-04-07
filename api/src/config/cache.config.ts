// TTLs en segundos
export const cacheConfig = {
  redis_host: process.env.REDIS_HOST || 'localhost',
  redis_port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redis_password: process.env.REDIS_PASSWORD || undefined,

  ttl: {
    album: 3600,
    artist: 7200,
    track: 3600,
    search: 60,
    recent: 300,
    mostPlayed: 600,
    count: 1800,
    playStats: 600,
    topItems: 900,
  },
};
