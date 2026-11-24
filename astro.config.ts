import tailwindcss from '@tailwindcss/vite';
import { AstroPWAIntegration as AstroPWA } from '@vite-pwa/astro';
import { defineConfig } from 'astro/config';
import { countries } from './src/data/countries';

// The site's pink: the app's splash screen and, where browsers support it, the status bar.
const PINK = '#f6b8d8';

// flag-icons also has flags for territories, regions and groups no quiz uses (gb-sct, eu, arab). They're built but never shown, so they're left out of the offline copy.
const quizCodes = new Set(countries.map((country) => country.code));
const isUnusedFlag = (url: string): boolean => {
  const code = /^_astro\/([a-z]+(?:-[a-z]+)?)\.[\w-]+\.svg$/.exec(url)?.[1];
  return code !== undefined && !quizCodes.has(code);
};

export default defineConfig({
  // Hide the dev toolbar Astro overlays on pages during `npm run dev`. It never appears in production builds.
  devToolbar: { enabled: false },
  integrations: [
    // Installable app with offline play. Every page, script, font, flag and outline (about 0.8 MB
    // compressed) is saved on the first visit, so every game works with no connection. New versions
    // download in the background and take over on the next visit.
    AstroPWA({
      registerType: 'autoUpdate',
      // Registered from src/scripts/main.ts.
      injectRegister: false,
      // The icons are already picked up by the file list below; don't list them twice.
      includeManifestIcons: false,
      manifest: {
        name: "Mike's Quizzes",
        short_name: 'Quizzes',
        description: 'Games, quizzes, and tools Michael Rendall builds for fun.',
        lang: 'en-GB',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: PINK,
        theme_color: PINK,
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      generateSW: {
        globPatterns: ['**/*.{html,js,css,svg,png,ico,woff2}'],
        // The Vietnamese font subsets aren't used (the Latin-extended ones are: Chișinău, Gdańsk).
        globIgnores: ['_astro/*-vietnamese-*.woff2'],
        manifestTransforms: [
          (entries) => ({ manifest: entries.filter((entry) => !isUnusedFlag(entry.url)), warnings: [] }),
        ],
        // Each page is its own file, so offline navigation loads that page, never a single fallback
        // page. Workbox matches clean URLs (/quizzes) to their files (quizzes.html) by itself.
        navigateFallback: null,
      },
    }),
  ],
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
