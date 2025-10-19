import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
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

  // Start server
  await app.listen(appConfig.port, '0.0.0.0');

  console.log(`
🎵 Music Server Backend
  🚀 Servidor corriendo en: http://localhost:${appConfig.port}
  📝 API Prefix: ${appConfig.api_prefix}
  🌍 CORS Origins: ${appConfig.cors_origins.join(', ')}
  🔒 Guards: MustChangePasswordGuard (Global)
  `);
}

bootstrap();