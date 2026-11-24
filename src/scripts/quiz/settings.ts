// Quiz settings shared by every quiz: how many questions per game, and which continents they come from.
// Each quiz stores its own settings and best scores under its id.
import { continents, countries, type Continent, type Country } from '../../data/countries';
import type { Mode } from './definition';

/** Game lengths on offer. "all" plays every country that matches the continent filter. */
export const LENGTHS = [10, 20, 50, 'all'] as const;
export type Length = (typeof LENGTHS)[number];

/**
 * Timer options. Stopwatch times the game; the numbers are a whole-game countdown in seconds, and the
 * game ends when it runs out.
 */
export const TIMERS = ['off', 'stopwatch', '60', '120', '300'] as const;
export type Timer = (typeof TIMERS)[number];
export const TIMER_LABELS: Record<Timer, string> = {
  off: 'Off',
  stopwatch: 'Stopwatch',
  '60': '1 minute',
  '120': '2 minutes',
  '300': '5 minutes',
};
/** The countdown's length in seconds, or null for no countdown. */
export const countdownSeconds = (timer: Timer): number | null =>
  timer === 'off' || timer === 'stopwatch' ? null : Number(timer);

export interface Settings {
  length: Length;
  continents: Continent[];
  mode: Mode;
  timer: Timer;
}

/** Defaults for a quiz; its first mode is the default mode. */
export const defaultSettings = (modes: readonly Mode[]): Settings => ({
  length: 10,
  continents: [...continents],
  mode: modes[0],
  timer: 'off',
});

/** The countries a game can draw from: the quiz's own list (all countries by default), on the chosen continents. */
export const poolFor = (settings: Settings, base: readonly Country[] = countries): Country[] =>
  base.filter((country) => settings.continents.includes(country.continent));

/** Questions in a game: the chosen length, or fewer if the filter leaves fewer countries. */
export function totalFor(settings: Settings, base: readonly Country[] = countries): number {
  const available = poolFor(settings, base).length;
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
    const timer = TIMERS.find((option) => option === saved?.timer) ?? defaults.timer;
    return { length, continents: chosen.length ? chosen : defaults.continents, mode, timer };
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
 * Best scores are kept per combination of mode, timer, game size and continents: 8 out of 10 by multiple
 * choice on Europe isn't comparable with 8 out of 10 typed on the whole world, or against the clock.
 * Untimed games keep the key they had before timers existed, so earlier best scores still count.
 */
const bestKey = (quizId: string, settings: Settings, base: readonly Country[]): string =>
  `${quizId}:best:${settings.mode}:${totalFor(settings, base)}:${[...settings.continents].sort().join(',')}` +
  (settings.timer === 'off' ? '' : `:${settings.timer}`);

/** A best result. `seconds` is kept for stopwatch games, where a faster run with the same score is better. */
export interface Best {
  score: number;
  seconds?: number;
}

export function readBest(quizId: string, settings: Settings, base: readonly Country[] = countries): Best | null {
  try {
    const raw = localStorage.getItem(bestKey(quizId, settings, base));
    if (!raw) return null;
    // Older best scores were saved as a bare number.
    const parsed = JSON.parse(raw) as Best | number;
    const best = typeof parsed === 'number' ? { score: parsed } : parsed;
    return Number.isInteger(best.score) && best.score > 0 ? best : null;
  } catch {
    return null;
  }
}

/** Whether a result beats the best so far: a higher score, or for stopwatch games the same score faster. */
export function beats(result: Best, previous: Best | null): boolean {
  if (result.score === 0) return false;
  if (!previous || result.score > previous.score) return true;
  return (
    result.score === previous.score &&
    result.seconds !== undefined &&
    (previous.seconds === undefined || result.seconds < previous.seconds)
  );
}

export function saveBest(quizId: string, settings: Settings, best: Best, base: readonly Country[] = countries): void {
  try {
    localStorage.setItem(bestKey(quizId, settings, base), JSON.stringify(best));
  } catch {
    // Not saved; the game still works.
  }
}
