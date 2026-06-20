import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'src/**', 'android/**']),
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty': 'off',
      'no-prototype-builtins': 'off',
      'no-fallthrough': 'off',
      'no-constant-condition': 'off',
      'no-useless-assignment': 'off',
      'no-cond-assign': 'off',
      'no-control-regex': 'off',
      'no-undef': 'off',
      'getter-return': 'off',
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
]);
