// Production Prisma config - ES Module format for Prisma 7
// This file is copied to Docker container for prisma migrate deploy

export default {
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
