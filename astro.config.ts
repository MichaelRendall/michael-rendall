import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  build: {
    // Output projects.html rather than projects/index.html, so existing links keep working.
    format: 'file',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline fonts as data URIs: inlined subsets are downloaded by every visitor,
      // which defeats unicode-range. Other small assets use Vite's default 4 kB limit.
      assetsInlineLimit: (filePath: string) => (/\.woff2?$/.test(filePath) ? false : undefined),
    },
  },
});
