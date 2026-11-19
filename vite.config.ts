import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page build: every HTML page must be listed here to be included in dist/.
export default defineConfig({
  build: {
    // Never inline fonts as data URIs: inlined subsets are downloaded by every visitor,
    // which defeats unicode-range. Other small assets use Vite's default 4 kB limit.
    assetsInlineLimit: (filePath) => (/\.woff2?$/.test(filePath) ? false : undefined),
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        projects: resolve(import.meta.dirname, 'projects.html'),
      },
    },
  },
});
