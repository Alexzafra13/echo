/**
 * Jest config for E2E tests
 *
 * These tests start the FULL NestJS application and make
 * real HTTP requests via supertest. They require:
 * - PostgreSQL database
 * - Redis cache
 *
 * Run with: pnpm test:e2e
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Setup para tests E2E
  setupFilesAfterEnv: ['<rootDir>/test/setup-test-db.ts'],

  // Configuración de transform
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          isolatedModules: true,
        },
      },
    ],
  },

  // Transformar uuid y otros módulos ES
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|music-metadata|strtok3|peek-readable|token-types)/)',
  ],

  // Path aliases
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
    // Mock ESM modules that Jest can't handle
    '^music-metadata$': '<rootDir>/test/__mocks__/music-metadata.ts',
  },

  // E2E tests run serially to avoid DB conflicts
  maxWorkers: 1,

  // Longer timeout for E2E tests (30 seconds)
  testTimeout: 30000,

  verbose: true,
};
