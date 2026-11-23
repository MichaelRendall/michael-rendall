// Quiz settings shared by every quiz: how many questions per game, and which continents they come from.
// Each quiz stores its own settings and best scores under its id.
import { continents, countries, type Continent, type Country } from '../../data/countries';
import type { Mode } from './definition';

/** Game lengths on offer. "all" plays every country that matches the continent filter. */
export const LENGTHS = [10, 20, 50, 'all'] as const;
export type Length = (typeof LENGTHS)[number];

export interface Settings {
  length: Length;
  continents: Continent[];
  mode: Mode;
}

/** Defaults for a quiz; its first mode is the default mode. */
export const defaultSettings = (modes: readonly Mode[]): Settings => ({
  length: 10,
  continents: [...continents],
  mode: modes[0],
});

/** The countries a game can draw from. */
export const poolFor = (settings: Settings): Country[] =>
  countries.filter((country) => settings.continents.includes(country.continent));

/** Questions in a game: the chosen length, or fewer if the filter leaves fewer countries. */
export function totalFor(settings: Settings): number {
  const available = poolFor(settings).length;
  return settings.length === 'all' ? available : Math.min(settings.length, available);
}

// Saved in this browser only. Storage can be blocked (private windows), so failures fall back to defaults.
export function loadSettings(quizId: string, modes: readonly Mode[]): Settings {
  const defaults = defaultSettings(modes);
  try {
    const saved = JSON.parse(localStorage.getItem(`${quizId}:settings`) ?? 'null') as Partial<Settings> | null;
    const length = LENGTHS.find((option) => option === saved?.length) ?? defaults.length;
    const chosen = continents.filter((continent) => saved?.continents?.includes(continent));
    const mode = modes.find((option) => option === saved?.mode) ?? defaults.mode;
    return { length, continents: chosen.length ? chosen : defaults.continents, mode };
  } catch {
    return defaults;
  }
}

export function saveSettings(quizId: string, settings: Settings): void {
  try {
    localStorage.setItem(`${quizId}:settings`, JSON.stringify(settings));
  } catch {
    // Not saved; the game still works.
  }
}

/**
 * Best scores are kept per combination of mode, game size and continents: 8 out of 10 by multiple choice
 * on Europe isn't comparable with 8 out of 10 typed on the whole world.
 */
const bestKey = (quizId: string, settings: Settings): string =>
  `${quizId}:best:${settings.mode}:${totalFor(settings)}:${[...settings.continents].sort().join(',')}`;

export function readBest(quizId: string, settings: Settings): number | null {
  try {
    const value = Number(localStorage.getItem(bestKey(quizId, settings)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveBest(quizId: string, settings: Settings, score: number): void {
  try {
    localStorage.setItem(bestKey(quizId, settings), String(score));
  } catch {
    // Not saved; the game still works.
  }
}
