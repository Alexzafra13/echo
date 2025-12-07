/**
 * Jest config for INTEGRATION tests
 *
 * These tests use REAL connections to:
 * - PostgreSQL database (4 DBs for parallel workers)
 * - Redis cache
 *
 * They test the actual implementation of repositories and services.
 * Run with: pnpm test:integration
 *
 * Requirements:
 * - PostgreSQL running (docker-compose.dev.yml)
 * - Redis running (docker-compose.dev.yml)
 * - Test databases created (music_server_test_1..4)
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',

  // Solo buscar tests de integración
  testRegex: '.*\\.integration-spec\\.ts$',

  preset: 'ts-jest',
  testEnvironment: 'node',

  // Setup que asigna BD por worker (evita race conditions)
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
    'node_modules/(?!(uuid|music-metadata|strtok3|token-types|peek-readable)/)',
  ],

  // Path aliases para los imports
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
    // Mock para music-metadata (módulo ES puro)
    '^music-metadata$': '<rootDir>/test/__mocks__/music-metadata.ts',
  },

  // 4 workers = 4 BDs en paralelo (evita race conditions)
  maxWorkers: 4,

  // Timeout más largo para operaciones de BD
  testTimeout: 15000,

  // Mostrar resultados individuales
  verbose: true,

  // Coverage para integration tests
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage/integration',
};
