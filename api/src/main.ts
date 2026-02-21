// Cargar .env solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv/config');
}

import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { WebSocketAdapter } from '@infrastructure/websocket';
import { MustChangePasswordInterceptor } from '@shared/interceptors/must-change-password.interceptor';
import { getVersion } from '@shared/utils/version.util';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { networkInterfaces as osNetworkInterfaces } from 'os';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  const maxFileSize = parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10); // Default: 10MB
  await app.register((await import('@fastify/multipart')).default, {
    limits: {
      fileSize: maxFileSize,
    },
  });

  // Compresión solo en desarrollo; en producción la maneja el proxy reverso
  if (process.env.NODE_ENV !== 'production') {
    await app.register((await import('@fastify/compress')).default, {
      encodings: ['gzip', 'deflate'],
      threshold: 1024,
      customTypes: /^(?!audio\/|video\/|image\/).*$/,
    });
    logger.log('Compression enabled (development mode)');
  } else {
    logger.log('Compression disabled - handled by reverse proxy');
  }

  await app.register((await import('@fastify/helmet')).default, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://ipapi.co'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:', 'http:', 'https:'],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: null, // Permitir HTTP en redes locales
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  app.useWebSocketAdapter(new WebSocketAdapter(app));

  app.enableCors({
    origin: appConfig.cors_origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix(appConfig.api_prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Serialización de BigInt para respuestas JSON
  // @ts-expect-error toJSON is not part of the BigInt interface but is needed for JSON serialization
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };

  // Interceptor que bloquea acceso si el usuario debe cambiar contraseña
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new MustChangePasswordInterceptor(reflector));

  // Swagger solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Echo Music Server API')
      .setDescription(
        'API REST para servidor de música con streaming, gestión de álbumes, artistas y playlists. ' +
          'Construido con arquitectura hexagonal y NestJS.'
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addTag('auth', 'Autenticación y autorización')
      .addTag('users', 'Gestión de perfil de usuario')
      .addTag('admin', 'Administración de usuarios')
      .addTag('albums', 'Gestión de álbumes')
      .addTag('tracks', 'Gestión de tracks y canciones')
      .addTag('artists', 'Gestión de artistas')
      .addTag('streaming', 'Streaming y descarga de audio')
      .addTag('playlists', 'Gestión de playlists y listas de reproducción')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log('Swagger documentation enabled at /api/docs');
  }

  // Servir archivos estáticos del frontend en producción
  const frontendPath = join(__dirname, '..', '..', 'web', 'dist');
  const indexHtmlPath = join(frontendPath, 'index.html');

  if (existsSync(frontendPath) && existsSync(indexHtmlPath)) {
    logger.log(`Serving frontend from: ${frontendPath}`);

    const fastify = app.getHttpAdapter().getInstance();
    const indexHtml = readFileSync(indexHtmlPath, 'utf-8');

    await fastify.register((await import('@fastify/static')).default, {
      root: frontendPath,
      prefix: '/',
      decorateReply: false,
    });

    // Fallback SPA: rutas desconocidas devuelven index.html
    fastify.addHook('preHandler', async (request, reply) => {
      const url = request.url;

      if (url.startsWith('/api/')) {
        return;
      }

      const filePath = join(frontendPath, url === '/' ? 'index.html' : url);
      if (existsSync(filePath)) {
        return;
      }

      reply
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Pragma', 'no-cache')
        .header('Expires', '0')
        .type('text/html')
        .send(indexHtml);
    });

    logger.log('Frontend static assets configured');
    logger.log('SPA fallback configured for client-side routing');
  } else {
    logger.warn(`Frontend not found at ${frontendPath}`);
    logger.warn(`Running in API-only mode (development)`);
  }

  await app.listen(appConfig.port, '0.0.0.0');

  const netInterfaces = osNetworkInterfaces();
  const networkIPs: string[] = [];

  for (const interfaceName in netInterfaces) {
    const interfaces = netInterfaces[interfaceName];
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkIPs.push(iface.address);
      }
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  const version = getVersion();

  logger.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 Echo Music Server v${version}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment: ${isProd ? '🚀 PRODUCTION' : '🔧 DEVELOPMENT'}
Node.js: ${process.version}

📡 Access URLs:
   Local:    http://localhost:${appConfig.port}${networkIPs.length > 0 ? `\n   Network:  ${networkIPs.map((ip) => `http://${ip}:${appConfig.port}`).join('\n             ')}` : ''}

📚 API Documentation:
   Swagger:  ${isProd ? '❌ Disabled in production' : `http://localhost:${appConfig.port}/api/docs`}
   Health:   http://localhost:${appConfig.port}/api/health

🔒 Security:
   CORS:     ${appConfig.cors_origins.join(', ')}
   Helmet:   ✅ Enabled (XSS, Clickjacking, etc.)
   Rate Limit: 100 req/min (global)
   Auth:     JWT + bcrypt (12 rounds)

🎯 Features:
   Frontend: ${existsSync(frontendPath) ? '✅ Served (single container)' : '❌ Not found (API-only mode)'}
   WebSocket: ✅ Enabled
   Cache:    ✅ Redis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // Apagado ordenado
  const SHUTDOWN_TIMEOUT = 10000;
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn({ signal }, 'Shutdown already in progress, ignoring signal');
      return;
    }
    isShuttingDown = true;

    logger.log({ signal }, 'Starting graceful shutdown...');

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      await app.close();
      clearTimeout(forceExitTimer);
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.error(
        { error: error instanceof Error ? error.message : error },
        'Error during graceful shutdown'
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error({ error: error.message, stack: error.stack }, 'Uncaught Exception');
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason: String(reason) }, 'Unhandled Rejection - initiating shutdown');
    gracefulShutdown('unhandledRejection');
  });
}

bootstrap();
