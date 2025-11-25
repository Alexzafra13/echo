// Load dotenv only in development (not available in Docker production stage)
try {
  require('dotenv/config')
} catch {
  // dotenv not available in production - env vars are set by Docker
}

import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',

  // Datasource - usa variable de entorno si existe
  // prisma generate no necesita esto, pero migrate sí
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },

  seed: 'tsx prisma/seed.ts',
})
