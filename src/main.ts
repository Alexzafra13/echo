import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: appConfig.cors_origins,
    credentials: true,
  });

  app.setGlobalPrefix(appConfig.api_prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(appConfig.port, '0.0.0.0');

  console.log(`
🎵 Music Server Backend
  🚀 Servidor corriendo en: http://localhost:${appConfig.port}
  📝 API Prefix: ${appConfig.api_prefix}
  🌍 CORS Origins: ${appConfig.cors_origins.join(', ')}
  `);
}

bootstrap();