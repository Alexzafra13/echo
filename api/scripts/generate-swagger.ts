/**
 * Generates swagger.json without starting the full server.
 * Usage: pnpm swagger:generate
 */
import 'reflect-metadata';

// Load .env for local development
require('dotenv/config');

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generate() {
  // Dynamically import AppModule to ensure all decorators are loaded
  const { AppModule } = await import('../src/app.module');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false }
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Echo Music Server API')
    .setDescription(
      'REST API for self-hosted music streaming server with audio streaming, album/artist/playlist management, ' +
        'social features, federation, and smart recommendations. Built with NestJS and hexagonal architecture.'
    )
    .setVersion('1.0.0')
    .setLicense('GPL-3.0', 'https://www.gnu.org/licenses/gpl-3.0.html')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addServer('http://localhost:4567', 'Local development')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = join(__dirname, '..', '..', 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`Swagger JSON generated at ${outputPath}`);
  console.log(`  - ${Object.keys(document.paths || {}).length} paths documented`);
  console.log(`  - ${Object.keys(document.components?.schemas || {}).length} schemas documented`);

  await app.close();
  process.exit(0);
}

generate().catch((err) => {
  console.error('Failed to generate Swagger JSON:', err);
  process.exit(1);
});
