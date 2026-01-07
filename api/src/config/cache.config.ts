/**
 * Configuración centralizada de caché Redis
 *
 * Todos los valores TTL están en segundos.
 * Los TTL están optimizados para balance entre frescura y rendimiento.
 */
export const cacheConfig = {
  // Conexión a Redis
  redis_host: process.env.REDIS_HOST || 'localhost',
  redis_port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redis_password: process.env.REDIS_PASSWORD || undefined,

  // TTLs por entidad (cuánto tiempo permanecen en caché)
  ttl: {
    album: parseInt(process.env.CACHE_ALBUM_TTL || '3600', 10), // 1 hora
    artist: parseInt(process.env.CACHE_ARTIST_TTL || '7200', 10), // 2 horas
    track: parseInt(process.env.CACHE_TRACK_TTL || '3600', 10), // 1 hora

    // TTLs para datos derivados (cambian más frecuentemente)
    search: 60, // 1 minuto (cambia frecuentemente)
    recent: parseInt(process.env.CACHE_RECENT_PLAYS_TTL || '300', 10), // 5 minutos
    mostPlayed: 600, // 10 minutos
    count: 1800, // 30 minutos

    // Específicos de seguimiento de reproducción
    playStats: parseInt(process.env.CACHE_PLAY_STATS_TTL || '600', 10), // 10 minutos
    topItems: parseInt(process.env.CACHE_TOP_ITEMS_TTL || '900', 10), // 15 minutos
  },
};