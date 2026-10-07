module.exports = [{
  files: ['**/*.js', '**/*.cjs'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: Object.fromEntries([
      'process', 'console', 'URL', 'fetch', 'setTimeout', 'AbortSignal',
      'describe', 'test', 'expect', 'beforeEach', 'afterEach', 'jest', 'global',
    ].map(name => [name, 'readonly'])),
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'eqeqeq': 'error',
  },
}];
