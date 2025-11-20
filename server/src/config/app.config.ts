import { networkInterfaces } from 'os';

/**
 * Auto-detect CORS origins based on environment
 */
function getDefaultCorsOrigins(): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Development: Vite dev server
    return 'http://localhost:5173';
  }

  // Production: Auto-detect IPs
  const port = process.env.PORT || '4567';
  const ifaces = networkInterfaces();
  const origins: string[] = [`http://localhost:${port}`];

  // Add all network IPs
  for (const interfaceName in ifaces) {
    const interfaces = ifaces[interfaceName];
    if (!interfaces) continue;
    for (const iface of interfaces) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        origins.push(`http://${iface.address}:${port}`);
      }
    }
  }

  return origins.join(',');
}

export const appConfig = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  api_prefix: process.env.API_PREFIX || 'api',
  cors_origins: (process.env.CORS_ORIGINS || getDefaultCorsOrigins()).split(','),
};