import { networkInterfaces } from 'os';

// Puerto por defecto: 3000 en dev, configurable via PORT (Docker usa 4567)
const DEFAULT_PORT = '3000';

function getDefaultCorsOrigins(): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    return 'http://localhost:5173';
  }

  // En producción se recomienda configurar CORS_ORIGINS explícitamente
  const port = process.env.PORT || DEFAULT_PORT;
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
  port: parseInt(process.env.PORT ?? DEFAULT_PORT, 10),
  api_prefix: 'api',
  cors_origins: (process.env.CORS_ORIGINS || getDefaultCorsOrigins()).split(','),
};