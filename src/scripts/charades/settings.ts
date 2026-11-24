// Charades settings: which prompts, how long a round lasts, and how many teams and rounds.
import { CATEGORIES, CATEGORY_LABELS, type Category, type Level } from '../../data/charades-prompts';

export const LEVEL_OPTIONS = ['mixed', 'easy', 'medium', 'hard'] as const;
export type LevelOption = (typeof LEVEL_OPTIONS)[number];
export const LEVEL_LABELS: Record<LevelOption, string> = {
  mixed: 'Mixed',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** Round lengths in seconds. 0 means no timer: the round ends when the actor taps End round. */
export const SECONDS_OPTIONS = [30, 60, 90, 0] as const;
export type Seconds = (typeof SECONDS_OPTIONS)[number];
export const secondsLabel = (s: Seconds): string => (s === 0 ? 'No timer' : `${s} seconds`);

export const TEAM_OPTIONS = [2, 3, 4] as const;
export type Teams = (typeof TEAM_OPTIONS)[number];

export const ROUND_OPTIONS = [3, 5, 10] as const;
export type Rounds = (typeof ROUND_OPTIONS)[number];

/** Used for any team without a name of its own. */
export const DEFAULT_TEAM_NAMES = ['Team A', 'Team B', 'Team C', 'Team D'];
export const TEAM_NAME_MAX = 20;

export interface Settings {
  categories: Category[];
  level: LevelOption;
  seconds: Seconds;
  teams: Teams;
  rounds: Rounds;
  sound: boolean;
  /** One per possible team. Blank means use the default name. */
  teamNames: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  categories: [...CATEGORIES],
  level: 'mixed',
  seconds: 60,
  teams: 2,
  rounds: 3,
  sound: true,
  teamNames: ['', '', '', ''],
};

/** A team's name: its own if it has one, else "Team A" and so on. */
export const teamName = (s: Settings, team: number): string => s.teamNames[team]?.trim() || DEFAULT_TEAM_NAMES[team];

/** "Team A's", or "The Bosses'" for names ending in s. */
export const possessive = (name: string): string => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

/** The levels a setting draws prompts from. */
export const levelsFor = (level: LevelOption): Level[] => (level === 'mixed' ? ['easy', 'medium', 'hard'] : [level]);

/** Summary tags: ["All categories", "Mixed", "60 seconds", "2 teams", "3 rounds each"]. */
export function describe(s: Settings): string[] {
  const categories =
    s.categories.length === CATEGORIES.length
      ? 'All categories'
      : s.categories.length <= 2
        ? s.categories.map((c) => CATEGORY_LABELS[c]).join(' and ')
        : `${s.categories.length} categories`;
  return [categories, LEVEL_LABELS[s.level], secondsLabel(s.seconds), `${s.teams} teams`, `${s.rounds} rounds each`];
}

const KEY = 'charades:settings';

// Saved in this browser only. Storage can be blocked (private windows), so failures fall back to defaults.
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
    const categories = CATEGORIES.filter((c) => saved?.categories?.includes(c));
    return {
      categories: categories.length ? categories : DEFAULT_SETTINGS.categories,
      level: LEVEL_OPTIONS.find((o) => o === saved?.level) ?? DEFAULT_SETTINGS.level,
      seconds: SECONDS_OPTIONS.find((o) => o === saved?.seconds) ?? DEFAULT_SETTINGS.seconds,
      teams: TEAM_OPTIONS.find((o) => o === saved?.teams) ?? DEFAULT_SETTINGS.teams,
      rounds: ROUND_OPTIONS.find((o) => o === saved?.rounds) ?? DEFAULT_SETTINGS.rounds,
      sound: typeof saved?.sound === 'boolean' ? saved.sound : DEFAULT_SETTINGS.sound,
      teamNames: DEFAULT_TEAM_NAMES.map((_, i) => {
        const name = saved?.teamNames?.[i];
        return typeof name === 'string' ? name.slice(0, TEAM_NAME_MAX) : '';
      }),
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
