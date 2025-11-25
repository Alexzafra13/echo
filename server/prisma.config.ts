import 'dotenv/config'
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
