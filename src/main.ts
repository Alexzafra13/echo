import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { MustChangePasswordGuard } from '@shared/guards/must-change-password.guard';

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
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start server
  await app.listen(appConfig.port, '0.0.0.0');

  console.log(`
🎵 Music Server Backend
  🚀 Servidor corriendo en: http://localhost:${appConfig.port}
  📝 API Prefix: ${appConfig.api_prefix}
  📚 Swagger Docs: http://localhost:${appConfig.port}/api/docs
  🌍 CORS Origins: ${appConfig.cors_origins.join(', ')}
  🔒 Guards: MustChangePasswordGuard (Global)
  `);
}

bootstrap();