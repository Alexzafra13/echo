import { networkInterfaces } from 'os';

/**
 * Detecta automáticamente los orígenes CORS basado en el entorno
 *
 * - Desarrollo: Usa el servidor de Vite (localhost:5173)
 * - Producción: Auto-detecta todas las IPs de red del servidor
 */
function getDefaultCorsOrigins(): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Desarrollo: Servidor de Vite
    return 'http://localhost:5173';
  }

  // Producción: Auto-detectar IPs de red
  const port = process.env.PORT || '4567';
  const ifaces = networkInterfaces();
  const origins: string[] = [`http://localhost:${port}`];

  // Agregar todas las IPs de red
  for (const interfaceName in ifaces) {
    const interfaces = ifaces[interfaceName];
    if (!interfaces) continue;
    for (const iface of interfaces) {
      // Omitir direcciones internas (loopback) y no-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        origins.push(`http://${iface.address}:${port}`);
      }
    }
  }

  return origins.join(',');
}

/**
 * Configuración principal de la aplicación
 *
 * Variables de entorno soportadas:
 * - NODE_ENV: Entorno (development/production/test)
 * - PORT: Puerto del servidor (default: 3000)
 * - API_PREFIX: Prefijo de rutas API (default: 'api')
 * - CORS_ORIGINS: Orígenes permitidos separados por coma
 */
export const appConfig = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  api_prefix: process.env.API_PREFIX || 'api',
  cors_origins: (process.env.CORS_ORIGINS || getDefaultCorsOrigins()).split(','),
};