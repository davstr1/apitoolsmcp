module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'security', 'jest'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended',
    'plugin:jest/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'prefer-const': 'error',
    'prefer-template': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'no-duplicate-imports': 'error',

    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-new-buffer': 'error',
    'security/detect-possible-timing-attacks': 'warn',

    // Jest rules
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
  },
  overrides: [
    {
      // CLI files can use console for user output
      files: ['src/cli/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Test files
      files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'security/detect-object-injection': 'off',
        'security/detect-non-literal-fs-filename': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    'logs/',
    '*.js',
    '!.eslintrc.js',
    '!jest.config.js',
  ],
};
