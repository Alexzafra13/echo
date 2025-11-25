import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // Schema relativo al config file (que está en server/)
  schema: 'prisma/schema.prisma',

  // Datasource requerido para migrate deploy
  datasource: {
    url: env('DATABASE_URL'),
  },

  // Seed command
  seed: 'tsx prisma/seed.ts',
})
