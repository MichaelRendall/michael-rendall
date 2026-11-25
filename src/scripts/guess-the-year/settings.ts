// Guess the Year settings, scoring and best scores.
import { CATEGORIES, CATEGORY_LABELS, prompts, type Category } from '../../data/guess-the-year';
import type { Timer } from '../quiz/settings';

export const LENGTHS = [10, 20] as const;
export type Length = (typeof LENGTHS)[number];

/** How far back prompts go, and where the year slider starts. "all" reaches back to the earliest prompt. */
export const ERAS = ['all', '1900', '1980'] as const;
export type Era = (typeof ERAS)[number];
export const ERA_LABELS: Record<Era, string> = { all: 'All time', '1900': 'Since 1900', '1980': 'Since 1980' };

export const MODES = ['solo', 'party'] as const;
export type Mode = (typeof MODES)[number];
export const MODE_LABELS: Record<Mode, string> = { solo: 'Solo', party: 'Party' };

/** Solo only: the same timer options as the other quizzes, minus the one-minute countdown. */
export const TIMERS = ['off', 'stopwatch', '120', '300'] as const satisfies readonly Timer[];
export type GtyTimer = (typeof TIMERS)[number];
export const TIMER_LABELS: Record<GtyTimer, string> = {
  off: 'Off',
  stopwatch: 'Stopwatch',
  '120': '2 minutes',
  '300': '5 minutes',
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const PLAYER_NAME_MAX = 20;
export const MAX_POINTS = 5;

/** 5 for spot on, 3 within 2 years, 1 within 5 years, else 0. */
export const pointsFor = (guess: number, year: number): number => {
  const off = Math.abs(guess - year);
  return off === 0 ? 5 : off <= 2 ? 3 : off <= 5 ? 1 : 0;
};

export interface Settings {
  length: Length;
  categories: Category[];
  era: Era;
  mode: Mode;
  players: string[];
  timer: GtyTimer;
}

export const DEFAULT_SETTINGS: Settings = {
  length: 10,
  categories: [...CATEGORIES],
  era: 'all',
  mode: 'solo',
  players: ['', ''],
  timer: 'off',
};

export const CURRENT_YEAR = new Date().getFullYear();

export interface Question {
  text: string;
  year: number;
  category: Category;
}

/** Every prompt the settings allow. */
export function poolFor(s: Settings): Question[] {
  const from = s.era === 'all' ? -Infinity : Number(s.era);
  return s.categories.flatMap((category) =>
    prompts[category].filter(([, year]) => year >= from).map(([text, year]) => ({ text, year, category })),
  );
}

export const totalFor = (s: Settings): number => Math.min(s.length, poolFor(s).length);

/** The slider's range: from the era's start (or the earliest prompt, rounded down to a century) to this year. */
export function rangeFor(s: Settings): [number, number] {
  if (s.era !== 'all') return [Number(s.era), CURRENT_YEAR];
  const earliest = Math.min(...CATEGORIES.flatMap((c) => prompts[c].map(([, year]) => year)));
  return [Math.floor(earliest / 100) * 100, CURRENT_YEAR];
}

export const playerName = (s: Settings, player: number): string => s.players[player]?.trim() || `Player ${player + 1}`;

/** Summary tags: ["10 questions", "All categories", "All time", "Solo"] and the timer, for Solo. */
export function describe(s: Settings): string[] {
  const categories =
    s.categories.length === CATEGORIES.length
      ? 'All categories'
      : s.categories.length <= 2
        ? s.categories.map((c) => CATEGORY_LABELS[c]).join(' and ')
        : `${s.categories.length} categories`;
  return [
    `${totalFor(s)} questions`,
    categories,
    ERA_LABELS[s.era],
    s.mode === 'party' ? `Party, ${s.players.length} players` : 'Solo',
    ...(s.mode === 'solo' && s.timer !== 'off' ? [TIMER_LABELS[s.timer]] : []),
  ];
}

const KEY = 'guess-the-year:settings';

// Saved in this browser only. Storage can be blocked (private windows), so failures fall back to defaults.
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
    const categories = CATEGORIES.filter((c) => saved?.categories?.includes(c));
    const players = Array.isArray(saved?.players)
      ? saved.players
          .slice(0, MAX_PLAYERS)
          .map((name) => (typeof name === 'string' ? name.slice(0, PLAYER_NAME_MAX) : ''))
      : [];
    return {
      length: LENGTHS.find((o) => o === saved?.length) ?? DEFAULT_SETTINGS.length,
      categories: categories.length ? categories : DEFAULT_SETTINGS.categories,
      era: ERAS.find((o) => o === saved?.era) ?? DEFAULT_SETTINGS.era,
      mode: MODES.find((o) => o === saved?.mode) ?? DEFAULT_SETTINGS.mode,
      players: players.length >= MIN_PLAYERS ? players : DEFAULT_SETTINGS.players,
      timer: TIMERS.find((o) => o === saved?.timer) ?? DEFAULT_SETTINGS.timer,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not saved; the game still works.
  }
}

/** Solo best scores, per game size, categories, era and timer. */
export const bestKey = (s: Settings): string =>
  `guess-the-year:best:${totalFor(s)}:${[...s.categories].sort().join(',')}:${s.era}:${s.timer}`;
