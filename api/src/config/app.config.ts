import { networkInterfaces } from 'os';

// Puerto por defecto: 3000 en dev, configurable via PORT (Docker usa 4567)
const DEFAULT_PORT = '3000';

function getDefaultCorsOrigins(): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    return 'http://localhost:5173';
  }

  // En producción CORS_ORIGINS debe configurarse explícitamente
  // Si no se configura, solo se permite el propio servidor
  const port = process.env.PORT || DEFAULT_PORT;
  const ifaces = networkInterfaces();
  const origins: string[] = [];

  for (const interfaceName in ifaces) {
    const interfaces = ifaces[interfaceName];
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        origins.push(`http://${iface.address}:${port}`);
      }
    }
  }

  return origins.length > 0 ? origins.join(',') : `http://127.0.0.1:${port}`;
}

export const appConfig = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? DEFAULT_PORT, 10),
  api_prefix: 'api',
  cors_origins: (process.env.CORS_ORIGINS || getDefaultCorsOrigins()).split(','),
  stream_timeout_ms: parseInt(process.env.STREAM_TIMEOUT_MS || '600000', 10),
};
