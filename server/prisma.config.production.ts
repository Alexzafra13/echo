// Production prisma config - no devDependency imports
// This file is copied to Docker container for prisma migrate deploy

// Prisma 7 config object (defineConfig is just a type helper)
export default {
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
}
