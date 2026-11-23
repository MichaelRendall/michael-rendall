// Flags quiz settings: how many flags per game, and which continents they come from.
import { continents, countries, type Continent, type Country } from '../../data/countries';

/** Game lengths on offer. "all" plays every country that matches the continent filter. */
export const LENGTHS = [10, 20, 50, 'all'] as const;
export type Length = (typeof LENGTHS)[number];

export interface Settings {
  length: Length;
  continents: Continent[];
}

export const DEFAULT_SETTINGS: Settings = { length: 10, continents: [...continents] };

const SETTINGS_KEY = 'flags:settings';

/** The countries a game can draw from. */
export const poolFor = (settings: Settings): Country[] =>
  countries.filter((country) => settings.continents.includes(country.continent));

/** Flags in a game: the chosen length, or fewer if the filter leaves fewer countries. */
export function totalFor(settings: Settings): number {
  const available = poolFor(settings).length;
  return settings.length === 'all' ? available : Math.min(settings.length, available);
}

// Saved in this browser only. Storage can be blocked (private windows), so failures fall back to defaults.
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<Settings> | null;
    const length = LENGTHS.find((option) => option === saved?.length) ?? DEFAULT_SETTINGS.length;
    const chosen = continents.filter((continent) => saved?.continents?.includes(continent));
    return { length, continents: chosen.length ? chosen : DEFAULT_SETTINGS.continents };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not saved; the game still works.
  }
}

/**
 * Best scores are kept per combination of game size and continents, since 8 out of 10
 * on Europe isn't comparable with 8 out of 10 on the whole world.
 */
const bestKey = (settings: Settings): string =>
  `flags:best:${totalFor(settings)}:${[...settings.continents].sort().join(',')}`;

export function readBest(settings: Settings): number | null {
  try {
    const value = Number(localStorage.getItem(bestKey(settings)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveBest(settings: Settings, score: number): void {
  try {
    localStorage.setItem(bestKey(settings), String(score));
  } catch {
    // Not saved; the game still works.
  }
}
