// Production Prisma config - Plain JavaScript (no TypeScript compilation needed)
// This file is copied to Docker container for prisma migrate deploy

module.exports = {
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
