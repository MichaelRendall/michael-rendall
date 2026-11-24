// Build-time only: each country's outline from src/assets/shapes/ (made by tools/make-shapes.mjs),
// emitted as a hashed file. The shapes page passes this map to the quiz, so each outline downloads
// only when it's shown.
import { countries } from './countries';
import { SHAPES_EXCLUDED } from './shapes';

const files = import.meta.glob<string>('/src/assets/shapes/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
});

export const shapeUrls: Record<string, string> = Object.fromEntries(
  countries
    .filter(({ code }) => !SHAPES_EXCLUDED.includes(code))
    .map(({ code, name }) => {
      const url = files[`/src/assets/shapes/${code}.svg`];
      if (!url) throw new Error(`No shape for ${name} (${code}): run node tools/make-shapes.mjs`);
      return [code, url];
    }),
);
