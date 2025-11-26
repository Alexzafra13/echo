module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // ✅ Setup que asigna BD por worker
  setupFilesAfterEnv: ['<rootDir>/../test/setup-test-db.ts'],
 
  // ✅ Excluir archivos innecesarios del coverage
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
 
  // ✅ Configuración correcta de transform
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
 
  // ✅ IMPORTANTE: Transformar uuid y otros módulos ES
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
 
  // ✅ Path aliases para los imports
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@features/(.*)$': '<rootDir>/features/$1',
    '^test/(.*)$': '<rootDir>/../test/$1',
    // Prisma 7: generated client is in src/generated/prisma
    '^(\\.\\./)+generated/prisma$': '<rootDir>/generated/prisma',
  },

  // ✅ 4 workers = 4 BDs = tests en paralelo SIN conflictos
  maxWorkers: 4,

  // ✅ Timeout: 10 segundos para tests de integración
  testTimeout: 10000,

  // ✅ Mostrar resultados individuales
  verbose: true,
};