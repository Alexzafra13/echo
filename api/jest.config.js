/**
 * Jest DEFAULT config - Runs UNIT tests
 *
 * This is the default config used by `pnpm test`.
 * Unit tests use MOCKS and don't need real DB/Redis connections.
 *
 * Available configs:
 * - jest.config.js (this)     → Unit tests (mocks only)
 * - jest-unit.config.js       → Same as this (explicit unit tests)
 * - jest-integration.config.js → Real DB/Redis connections
 * - jest-e2e.config.js        → Full HTTP E2E tests
 *
 * Scripts:
 * - pnpm test           → Unit tests (this config)
 * - pnpm test:unit      → Unit tests (explicit)
 * - pnpm test:integration → Integration tests
 * - pnpm test:e2e       → E2E tests
 * - pnpm test:all       → All tests sequentially
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Excluir tests de integración y E2E
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration-spec\\.ts$',
    '\\.e2e-spec\\.ts$',
  ],

  // NO setup de BD para unit tests - son más rápidos sin él
  // setupFilesAfterEnv: [] - intencionalmente sin setup de BD

  // Excluir archivos innecesarios del coverage
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.dto.ts',
    '!**/*.module.ts',
    '!**/index.ts',
    '!**/main.ts',
    '!**/*.d.ts',
  ],
  coverageDirectory: '../coverage',

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
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@features/(.*)$': '<rootDir>/features/$1',
    '^test/(.*)$': '<rootDir>/../test/$1',
    // Prisma 7: generated client is in src/generated/prisma
    '^(\\.\\./)+generated/prisma$': '<rootDir>/generated/prisma',
    // Mock para music-metadata (módulo ES puro)
    '^music-metadata$': '<rootDir>/../test/__mocks__/music-metadata.ts',
  },

  // Más workers para unit tests (son rápidos, solo mocks)
  maxWorkers: '50%',

  // Timeout corto para unit tests - deben ser rápidos
  testTimeout: 5000,

  // Mostrar resultados individuales
  verbose: true,
};
