/**
 * Jest config for UNIT tests only
 *
 * These tests use MOCKS and do NOT require:
 * - Database connection
 * - Redis connection
 * - External services
 *
 * This makes them fast (~ms per test) and isolated.
 * Run with: pnpm test:unit
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Excluir tests de integración (están en test/integration/)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/integration/',
    '/e2e/',
  ],

  // NO cargamos setup de BD - los unit tests usan mocks
  // setupFilesAfterEnv: [] - intencionalmente vacío

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
  coverageDirectory: '../coverage/unit',

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
    // Mock for music-metadata (pure ES module)
    '^music-metadata$': '<rootDir>/../test/__mocks__/music-metadata.ts',
  },

  // Más workers porque los unit tests son rápidos (solo mocks)
  maxWorkers: '50%',

  // Timeout corto - unit tests deben ser rápidos
  testTimeout: 5000,

  // Mostrar resultados individuales
  verbose: true,
};
