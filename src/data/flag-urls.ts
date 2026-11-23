// Build-time only: each country's flag SVG from the flag-icons package, emitted as a hashed file.
// Pages pass this map to their game script (as data-flags), so only the URLs reach the browser and
// each flag downloads only when it's shown.
import { countries } from './countries';

const files = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
});

export const flagUrls: Record<string, string> = Object.fromEntries(
  countries.map(({ code }) => {
    const url = files[`/node_modules/flag-icons/flags/4x3/${code}.svg`];
    if (!url) throw new Error(`No flag file for "${code}"`);
    return [code, url];
  }),
);
