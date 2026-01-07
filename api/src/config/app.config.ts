import { networkInterfaces } from 'os';

// Auto-detecta CORS: en dev usa Vite, en prod detecta las IPs de red
function getDefaultCorsOrigins(): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    return 'http://localhost:5173';
  }

  const port = process.env.PORT || '4567';
  const ifaces = networkInterfaces();
  const origins: string[] = [`http://localhost:${port}`];

  for (const interfaceName in ifaces) {
    const interfaces = ifaces[interfaceName];
    if (!interfaces) continue;
    for (const iface of interfaces) {
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