import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page build: every HTML page must be listed here to be included in dist/.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        projects: resolve(import.meta.dirname, 'projects.html'),
      },
    },
  },
});
