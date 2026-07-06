import css from '@eslint/css'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import markdown from '@eslint/markdown'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig([
  {
    files: ['**/*.css'],
    language: 'css/css',
    extends: [css.configs.recommended],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
        Module: 'readonly',
        config: 'readonly',
      },
    },
    extends: [js.configs.recommended, stylistic.configs.recommended],
    rules: {
      '@stylistic/semi': ['error', 'never'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['demo.config.js'],
    rules: {
      'prefer-const': 'off',
    },
  },
  {
    files: ['**/*.md'],
    extends: [markdown.configs.recommended],
    language: 'markdown/gfm',
  },
])
