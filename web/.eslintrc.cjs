module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Feature boundary rules: prevent reaching into another feature's internals.
    // Features should import from barrels (@features/<name>) not internals (@features/<name>/components/Foo).
    // Within a feature, use relative paths for internal imports.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '@features/*/components/*',
              '@features/*/hooks/*',
              '@features/*/pages/*',
              '@features/*/context/*',
            ],
            message:
              'Do not import internal modules from other features. Import from the feature barrel (@features/<feature>) or move shared code to @shared/.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // App composition root can import anything
      files: ['src/app/**/*'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      // Shared can reference feature internals for re-exports
      files: ['src/shared/**/*'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
}
