// Generates the app icons from public/favicon.svg. Run: npx pwa-assets-generator --config tools/pwa-assets.config.mjs
// It writes into tools/.cache/icons/; copy pwa-192x192.png, pwa-512x512.png and maskable-icon-512x512.png
// from there into public/icons/. (Pointing it at public/ directly would overwrite the existing favicons.)
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// The page's pink, so the padding Android adds around a maskable icon blends in.
const background = '#f6b8d8';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
  },
  images: ['tools/.cache/icons/favicon.svg'],
});
