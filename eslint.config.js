// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', '.astro/', 'node_modules/'] },

  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,

  // Astro components, including accessibility checks on their markup (via eslint-plugin-jsx-a11y-x).
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],

  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Config files run in Node.
  {
    files: ['*.config.{js,ts,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Turn off rules that clash with Prettier. Keep this last.
  prettier,
);
