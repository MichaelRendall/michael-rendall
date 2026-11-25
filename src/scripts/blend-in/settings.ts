// Blend In settings: players, categories, Classic or Undercover, clue rounds and an optional discussion timer.
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../data/blend-in-words';

export const MODES = ['classic', 'undercover'] as const;
export type Mode = (typeof MODES)[number];
export const MODE_LABELS: Record<Mode, string> = { classic: 'Classic', undercover: 'Undercover' };

export const CLUE_ROUND_OPTIONS = [1, 2] as const;
export type ClueRounds = (typeof CLUE_ROUND_OPTIONS)[number];

/** Discussion timer in seconds; 0 means no timer. */
export const DISCUSS_OPTIONS = [0, 60, 120] as const;
export type DiscussSeconds = (typeof DISCUSS_OPTIONS)[number];
export const discussLabel = (s: DiscussSeconds): string => (s === 0 ? 'No timer' : s === 60 ? '1 minute' : '2 minutes');

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const PLAYER_NAME_MAX = 20;

export interface Settings {
  /** One entry per player, in order round the circle. Blank means "Player 1" and so on. */
  players: string[];
  categories: Category[];
  mode: Mode;
  clueRounds: ClueRounds;
  discussSeconds: DiscussSeconds;
}

export const DEFAULT_SETTINGS: Settings = {
  players: ['', '', '', ''],
  categories: [...CATEGORIES],
  mode: 'classic',
  clueRounds: 1,
  discussSeconds: 0,
};

/** A player's name: their own if they have one, else "Player 1" and so on. */
export const playerName = (s: Settings, player: number): string => s.players[player]?.trim() || `Player ${player + 1}`;

/** Summary tags: ["4 players", "All categories", "Classic", "1 clue round"] plus the timer if there is one. */
export function describe(s: Settings): string[] {
  const categories =
    s.categories.length === CATEGORIES.length
      ? 'All categories'
      : s.categories.length <= 2
        ? s.categories.map((c) => CATEGORY_LABELS[c]).join(' and ')
        : `${s.categories.length} categories`;
  return [
    `${s.players.length} players`,
    categories,
    MODE_LABELS[s.mode],
    s.clueRounds === 1 ? '1 clue round' : `${s.clueRounds} clue rounds`,
    ...(s.discussSeconds ? [`${discussLabel(s.discussSeconds)} to discuss`] : []),
  ];
}

const KEY = 'blend-in:settings';

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
      players: players.length >= MIN_PLAYERS ? players : DEFAULT_SETTINGS.players,
      categories: categories.length ? categories : DEFAULT_SETTINGS.categories,
      mode: MODES.find((m) => m === saved?.mode) ?? DEFAULT_SETTINGS.mode,
      clueRounds: CLUE_ROUND_OPTIONS.find((o) => o === saved?.clueRounds) ?? DEFAULT_SETTINGS.clueRounds,
      discussSeconds: DISCUSS_OPTIONS.find((o) => o === saved?.discussSeconds) ?? DEFAULT_SETTINGS.discussSeconds,
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
