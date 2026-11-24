// What each quiz tells the shared engine (src/scripts/quiz/engine.ts). The engine runs the game;
// a definition says what to ask, what counts as right, and what to show afterwards.
import type { Country } from '../../data/countries';

/**
 * type: the player types the answer, with unlimited tries, and moves freely between unanswered questions.
 * choice: the player taps one of four options, one try per question, in order.
 */
export type Mode = 'type' | 'choice';

export const MODE_LABELS: Record<Mode, string> = { type: 'Typing', choice: 'Multiple choice' };

export interface QuizDefinition {
  /** Prefix for this quiz's saved settings and best scores, e.g. "flags". */
  id: string;
  /** The countries this quiz uses, if not all of them (the shapes quiz leaves some out). */
  countries?: readonly Country[];
  /** Plural noun for the summary and settings, e.g. "flags" in "10 flags from all continents". */
  unit: string;
  /** Word before the progress count, e.g. "Flag" in "Flag 3 of 10". */
  progressLabel: string;
  /** The modes this quiz offers. The first is the default; with more than one, settings let the player choose. */
  modes: readonly Mode[];
  /** The start screen's explanation for each mode the quiz offers. */
  intro: Partial<Record<Mode, string>>;
  /** Heading above the missed list on the results screen. */
  missedHeading: string;
  /** The question for a country, e.g. "What's the capital of Peru?". */
  question(country: Country): string;
  /** Alt text for the question's picture: the flag, or the country's shape. */
  imageAlt(country: Country): string;
  /** The right answer as shown in feedback, e.g. "Lima". */
  answer(country: Country): string;
  /** Type mode: whether the text typed so far is right. */
  isCorrect?(guess: string, country: Country): boolean;
  /** Choice mode: the options to offer, right answer included, in display order. */
  options?(country: Country): string[];
  /** A results-screen entry for a question the player didn't get. `pick` is their wrong choice, if any. */
  missed(country: Country, pick?: string): { title: string; lines: string[] };
}

/** Random order, no repeats (Fisher–Yates on a copy). */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
