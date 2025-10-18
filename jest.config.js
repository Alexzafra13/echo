module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.(t|j)s',
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
  },
};