// Mock Prisma Client globally before any tests run
// This prevents Jest from trying to import the generated client which may not exist
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const workerId = process.env.JEST_WORKER_ID || '0';
process.env.DATABASE_URL = `postgresql://music_admin:music_password@localhost:5432/music_server_test_${workerId}`;

console.log(`🧪 Test Worker ${workerId} → music_server_test_${workerId}`);
