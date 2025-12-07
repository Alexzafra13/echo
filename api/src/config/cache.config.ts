/**
 * Centralized cache configuration.
 * All TTL values are in seconds.
 */
export const cacheConfig = {
  // Redis connection
  redis_host: process.env.REDIS_HOST || 'localhost',
  redis_port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redis_password: process.env.REDIS_PASSWORD || undefined,

  // Entity TTLs (how long individual entities stay in cache)
  ttl: {
    album: parseInt(process.env.CACHE_ALBUM_TTL || '3600', 10), // 1 hour
    artist: parseInt(process.env.CACHE_ARTIST_TTL || '7200', 10), // 2 hours
    track: parseInt(process.env.CACHE_TRACK_TTL || '3600', 10), // 1 hour

    // Common TTLs for derived data
    search: 60, // 1 minute (changes frequently)
    recent: parseInt(process.env.CACHE_RECENT_PLAYS_TTL || '300', 10), // 5 minutes
    mostPlayed: 600, // 10 minutes
    count: 1800, // 30 minutes

    // Play tracking specific
    playStats: parseInt(process.env.CACHE_PLAY_STATS_TTL || '600', 10), // 10 minutes
    topItems: parseInt(process.env.CACHE_TOP_ITEMS_TTL || '900', 10), // 15 minutes
  },
};