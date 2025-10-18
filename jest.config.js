module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@features/(.*)$': '<rootDir>/features/$1',
  },
};