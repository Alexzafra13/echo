// Load dotenv only in development (not available in Docker production stage)
try {
  require('dotenv/config')
} catch {
  // dotenv not available in production - env vars are set by Docker
}

// Prisma 7 configuration
// Note: We export a plain object instead of using defineConfig() because
// the 'prisma' package is a devDependency and not available in Docker production stage.
// defineConfig is just a TypeScript type helper with no runtime functionality.
export default {
  earlyAccess: true,
  schema: 'prisma/schema.prisma',

  // Datasource - usa variable de entorno si existe
  // prisma generate no necesita esto, pero migrate sí
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },

  seed: 'tsx prisma/seed.ts',
}
