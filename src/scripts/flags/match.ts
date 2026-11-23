// Checks a typed answer against the country on screen. Pure functions, no DOM.
import type { Country } from '../../data/countries';

/**
 * Reduces a name to a bare comparison key: "St. Vincent & the Grenadines" and
 * "saint vincent and grenadines" both become "stvincentandgrenadines".
 */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\s+/g, '');
}

/**
 * True when the guess matches the country's name or one of its aliases. Exact matches only:
 * guesses are checked on every keystroke, so allowing typos would credit half-typed names of
 * other countries ("Austra", on the way to Australia, is one letter off Austria).
 */
export function isCorrect(guess: string, country: Country): boolean {
  const key = normalise(guess);
  return key !== '' && [country.name, ...(country.aliases ?? [])].some((name) => normalise(name) === key);
}
