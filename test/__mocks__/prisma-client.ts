// Mock for @prisma/client to avoid Prisma generation issues in tests

export class PrismaClient {
  constructor() {}

  async $connect() {}
  async $disconnect() {}
  async $transaction(fn: any) {
    return fn(this);
  }

  // Mock all Prisma model delegates as needed
  user = {};
  track = {};
  album = {};
  artist = {};
  playlist = {};
  libraryScan = {};
}

export const Prisma = {
  // Mock Prisma namespace if needed
};
