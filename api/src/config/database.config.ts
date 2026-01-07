/**
 * Configuración de base de datos PostgreSQL
 *
 * Valores por defecto optimizados para uso self-hosted.
 * El pool de conexiones previene el agotamiento de conexiones en la BD.
 */
export const databaseConfig = {
  database_url: process.env.DATABASE_URL,

  // Pool de conexiones - previene agotamiento de conexiones en BD
  pool: {
    max: 20,                      // Máximo de conexiones (suficiente para la mayoría de casos)
    min: 2,                       // Mantener 2 conexiones activas
    idleTimeoutMillis: 30000,     // Cerrar conexiones inactivas después de 30s
    connectionTimeoutMillis: 5000, // Fallar rápido si la BD no responde
    statementTimeout: 60000,      // Matar queries que tarden > 60s
  },
};
