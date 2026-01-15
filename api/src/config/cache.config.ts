/**
 * Cache Configuration
 *
 * Redis connection from environment, TTLs are optimized defaults.
 * TTLs in seconds.
 */
export const cacheConfig = {
  redis_host: process.env.REDIS_HOST || 'localhost',
  redis_port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redis_password: process.env.REDIS_PASSWORD || undefined,

  ttl: {
    album: 3600,      // 1 hour - albums change rarely
    artist: 7200,     // 2 hours - artists change very rarely
    track: 3600,      // 1 hour - tracks change rarely
    search: 60,       // 1 minute - search results are dynamic
    recent: 300,      // 5 minutes - recent plays update frequently
    mostPlayed: 600,  // 10 minutes
    count: 1800,      // 30 minutes - counts are expensive queries
    playStats: 600,   // 10 minutes
    topItems: 900,    // 15 minutes
  },
};
