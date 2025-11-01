import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { MustChangePasswordGuard } from '@shared/guards/must-change-password.guard';
import { BigIntTransformInterceptor } from '@shared/interceptors/bigint-transform.interceptor';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // CORS
  app.enableCors({
    origin: appConfig.cors_origins,
    credentials: true,
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

  // BigInt Transform Interceptor Global
  // Converts BigInt to string in JSON responses
  app.useGlobalInterceptors(new BigIntTransformInterceptor());

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
    console.log(`📦 Serving frontend from: ${frontendPath}`);

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
    console.log(`⚠️  Frontend not found at ${frontendPath}`);
    console.log(`   Running in API-only mode (development)`);
  }

  // Start server
  await app.listen(appConfig.port, '0.0.0.0');

  console.log(`
🎵 Echo Music Server
  🚀 Servidor corriendo en: http://localhost:${appConfig.port}
  📝 API Prefix: ${appConfig.api_prefix}
  📚 Swagger Docs: http://localhost:${appConfig.port}/api/docs
  🌍 CORS Origins: ${appConfig.cors_origins.join(', ')}
  🔒 Guards: MustChangePasswordGuard (Global)
  ${existsSync(frontendPath) ? '🎨 Frontend: Served from single container (Jellyfin-style)' : ''}
  `);
}

bootstrap();