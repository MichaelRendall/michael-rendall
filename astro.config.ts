import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Hide the dev toolbar Astro overlays on pages during `npm run dev`. It never appears in production builds.
  devToolbar: { enabled: false },
  build: {
    // Output quizzes.html rather than quizzes/index.html. Vercel's cleanUrls serves it at /quizzes.
    format: 'file',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline fonts as data URIs: inlined subsets are downloaded by every visitor,
      // which defeats unicode-range. Flags and country shapes stay as files too, so a quiz only downloads the ones it shows.
      // Other small assets use Vite's default 4 kB limit.
      assetsInlineLimit: (filePath: string) =>
        /\.woff2?$/.test(filePath) || filePath.includes('flag-icons') || filePath.includes('/assets/shapes/')
          ? false
          : undefined,
    },
  },
});
