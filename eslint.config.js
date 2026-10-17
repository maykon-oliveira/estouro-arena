import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // src/core é simulação pura: sem Phaser, DOM, Math.random ou relógio (CLAUDE.md, regra 1).
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'src/core não pode importar Phaser.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'performance'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use o RNG com seed de src/core/rng.ts.' },
        { object: 'Date', property: 'now', message: 'Use o tick da simulação.' },
      ],
    },
  },
  prettier,
);
