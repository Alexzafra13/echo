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

  // Security: Helmet - Protection against common web vulnerabilities
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'], // Allow data URIs and blobs for images
        connectSrc: ["'self'"], // WebSocket connections
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:'], // Allow blob URLs for audio streaming
        frameSrc: ["'none'"],
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

  // Swagger Configuration
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

  // Serve Frontend Static Files (Production)
  // Similar to Jellyfin/Navidrome: single container serves both API and frontend
  const frontendPath = join(__dirname, '..', '..', 'frontend', 'dist');
  const indexHtmlPath = join(frontendPath, 'index.html');

  if (existsSync(frontendPath) && existsSync(indexHtmlPath)) {
    logger.log(`Serving frontend from: ${frontendPath}`);

    // Read index.html once at startup
    const indexHtmlContent = readFileSync(indexHtmlPath, 'utf-8');

    // Serve static assets (js, css, images, etc.)
    app.useStaticAssets({
      root: frontendPath,
      prefix: '/',
    });

    // SPA fallback: todas las rutas no-API sirven index.html
    // Necesitamos acceder a la instancia de Fastify subyacente
    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.setNotFoundHandler((request, reply) => {
      const url = request.url;

      // Si es una ruta API, devuelve 404 JSON
      if (url.startsWith('/api/') || url.startsWith('/health')) {
        reply.code(404).send({
          statusCode: 404,
          message: 'Not Found',
          error: 'Not Found',
        });
      } else {
        // Para cualquier otra ruta, sirve el index.html (SPA)
        reply.type('text/html').send(indexHtmlContent);
      }
    });
  } else {
    logger.warn(`Frontend not found at ${frontendPath}`);
    logger.warn(`Running in API-only mode (development)`);
  }

  // Start server
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
   Swagger:  http://localhost:${appConfig.port}/api/docs
   Health:   http://localhost:${appConfig.port}/health

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
}

bootstrap();