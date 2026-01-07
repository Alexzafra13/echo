// TTLs en segundos
export const cacheConfig = {
  redis_host: process.env.REDIS_HOST || 'localhost',
  redis_port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redis_password: process.env.REDIS_PASSWORD || undefined,

  ttl: {
    album: parseInt(process.env.CACHE_ALBUM_TTL || '3600', 10),
    artist: parseInt(process.env.CACHE_ARTIST_TTL || '7200', 10),
    track: parseInt(process.env.CACHE_TRACK_TTL || '3600', 10),
    search: 60,
    recent: parseInt(process.env.CACHE_RECENT_PLAYS_TTL || '300', 10),
    mostPlayed: 600,
    count: 1800,
    playStats: parseInt(process.env.CACHE_PLAY_STATS_TTL || '600', 10),
    topItems: parseInt(process.env.CACHE_TOP_ITEMS_TTL || '900', 10),
  },
};