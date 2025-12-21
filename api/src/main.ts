// Load .env only in development (in production, Docker sets env vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv/config');
}

import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { MustChangePasswordGuard } from '@shared/guards/must-change-password.guard';
import { WebSocketAdapter } from '@infrastructure/websocket';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

async function bootstrap() {
  // Configure Fastify to handle BigInt serialization
  const fastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { bufferLogs: true }, // Buffer logs until Pino logger is ready
  );

  // Set Pino as the application logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Register multipart/form-data support for file uploads
  await app.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max (covers both avatars 5MB and covers 10MB)
    },
  });

  // Compression for JSON responses
  // Auto-detects if running behind a reverse proxy (nginx) and skips compression
  // to avoid double-compression which causes ERR_CONTENT_DECODING_FAILED errors
  const forceDisableCompression = process.env.DISABLE_COMPRESSION === 'true';

  if (!forceDisableCompression) {
    // Register compression plugin
    await app.register(require('@fastify/compress'), {
      encodings: ['gzip', 'deflate'],
      threshold: 1024, // Only compress responses > 1KB
      // Skip compression for audio/video/images (already compressed)
      customTypes: /^(?!audio\/|video\/|image\/).*$/,
    });

    // Add hook to disable compression when behind a reverse proxy
    // This prevents double-compression (nginx + Fastify) which corrupts responses
    const fastifyInstance = app.getHttpAdapter().getInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastifyInstance.addHook('onRequest', async (request: any, reply: any) => {
      // If request has X-Forwarded-For or X-Forwarded-Proto, it's behind a proxy
      // Disable Fastify compression and let the proxy handle it
      if (request.headers['x-forwarded-for'] || request.headers['x-forwarded-proto']) {
        // reply.compress is added by @fastify/compress plugin
        if (typeof reply.compress === 'function') {
          reply.compress(false);
        }
      }
    });

    logger.log('Compression enabled (auto-disabled when behind reverse proxy)');
  } else {
    logger.log('Compression disabled (DISABLE_COMPRESSION=true)');
  }

  // Security: Helmet - Protection against common web vulnerabilities
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // Allow inline styles and Google Fonts
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'], // Allow external images (radio logos, covers)
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://ipapi.co'], // WebSocket + geolocation API
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'], // Allow Google Fonts
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:', 'http:', 'https:'], // Allow blob URLs + external radio streams (HTTP and HTTPS)
        frameSrc: ["'none'"],
        upgradeInsecureRequests: null, // Disable HTTPS redirect - allow HTTP for local networks
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for audio streaming
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow audio streaming across origins
  });

  // WebSocket Adapter
  app.useWebSocketAdapter(new WebSocketAdapter(app));

  // CORS
  app.enableCors({
    origin: appConfig.cors_origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API Prefix
  app.setGlobalPrefix(appConfig.api_prefix);

  // Validation Pipe Global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure BigInt serialization for JSON responses
  // Add toJSON method to BigInt prototype so JSON.stringify handles it automatically
  // This is the standard way to make a type JSON-serializable
  // @ts-ignore - BigInt doesn't have toJSON in type definitions, but we can add it
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };

  // MustChangePasswordGuard Global
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new MustChangePasswordGuard(reflector));

  // Swagger Configuration (Development only)
  // In production, API docs are not needed and we save memory
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
        'JWT-auth',
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

  // Serve Frontend Static Files (Production)
  // Similar to Jellyfin/Navidrome: single container serves both API and frontend
  const frontendPath = join(__dirname, '..', '..', 'web', 'dist');
  const indexHtmlPath = join(frontendPath, 'index.html');

  if (existsSync(frontendPath) && existsSync(indexHtmlPath)) {
    logger.log(`Serving frontend from: ${frontendPath}`);

    const fastify = app.getHttpAdapter().getInstance();
    const indexHtml = readFileSync(indexHtmlPath, 'utf-8');

    // Register @fastify/static for serving static assets
    await fastify.register(require('@fastify/static'), {
      root: frontendPath,
      prefix: '/',
      decorateReply: false,
    });

    // Use preHandler hook to implement SPA routing
    // This runs BEFORE NestJS routing, so it can intercept and serve index.html
    fastify.addHook('preHandler', async (request, reply) => {
      const url = request.url;

      // Skip API routes - let NestJS handle them
      if (url.startsWith('/api/')) {
        return;
      }

      // Skip if it's a static file that exists
      // @fastify/static will handle: /, /assets/*, /vite.svg, etc.
      // We only want to serve index.html for unknown routes like /login, /albums
      const filePath = join(frontendPath, url === '/' ? 'index.html' : url);
      if (existsSync(filePath)) {
        return;
      }

      // Serve index.html for SPA client-side routing
      // Add cache-control headers to prevent browser caching issues
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

  // Start server (this calls app.init() automatically)
  await app.listen(appConfig.port, '0.0.0.0');

  // Auto-detect server IPs for easier access
  const networkInterfaces = require('os').networkInterfaces();
  const networkIPs: string[] = [];

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        networkIPs.push(iface.address);
      }
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  const version = process.env.VERSION || '1.0.0';

  logger.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 Echo Music Server v${version}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment: ${isProd ? '🚀 PRODUCTION' : '🔧 DEVELOPMENT'}
Node.js: ${process.version}

📡 Access URLs:
   Local:    http://localhost:${appConfig.port}${networkIPs.length > 0 ? `\n   Network:  ${networkIPs.map(ip => `http://${ip}:${appConfig.port}`).join('\n             ')}` : ''}

📚 API Documentation:
   Swagger:  ${isProd ? '❌ Disabled in production' : `http://localhost:${appConfig.port}/api/docs`}
   Health:   http://localhost:${appConfig.port}/api/health

🔒 Security:
   CORS:     ${appConfig.cors_origins.join(', ')}
   Helmet:   ✅ Enabled (XSS, Clickjacking, etc.)
   Rate Limit: 100 req/min (global)
   Auth:     JWT with ${process.env.BCRYPT_ROUNDS || 12} bcrypt rounds

🎯 Features:
   Frontend: ${existsSync(frontendPath) ? '✅ Served (Jellyfin-style single container)' : '❌ Not found (API-only mode)'}
   WebSocket: ✅ Enabled
   Cache:    ${process.env.ENABLE_CACHE !== 'false' ? '✅ Redis' : '❌ Disabled'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Close the NestJS application (triggers OnModuleDestroy hooks)
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

bootstrap();