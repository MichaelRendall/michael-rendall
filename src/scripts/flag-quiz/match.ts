// Checks a typed answer against the country on screen. Pure functions, no DOM.
import type { Country } from '../../data/countries';

export type Verdict = 'correct' | 'close' | 'wrong';

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

/** Edit distance where swapping two neighbouring letters counts as one typo, not two. */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, d[i - 2][j - 2] + 1);
      d[i][j] = best;
    }
  }
  return d[a.length][b.length];
}

/** How many typos a name can absorb. Short names get none, so "Iraq" never passes for "Iran". */
function tolerance(key: string): number {
  if (key.length >= 10) return 2;
  if (key.length >= 5) return 1;
  return 0;
}

const keysOf = (country: Country): string[] => [country.name, ...(country.aliases ?? [])].map(normalise);

/**
 * "correct" for an exact match to any of the country's names.
 * "close" for a small typo, but only when the guess isn't as close to another country:
 * "Nigera" is one letter from both Niger and Nigeria, so it doesn't count for either.
 */
export function check(guess: string, answer: Country, all: Country[]): Verdict {
  const key = normalise(guess);
  if (!key) return 'wrong';
  if (keysOf(answer).includes(key)) return 'correct';

  let answerBest = Infinity;
  let otherBest = Infinity;
  for (const country of all) {
    for (const name of keysOf(country)) {
      const dist = distance(key, name);
      if (country.code === answer.code) {
        if (dist <= tolerance(name)) answerBest = Math.min(answerBest, dist);
      } else {
        otherBest = Math.min(otherBest, dist);
      }
    }
  }
  return answerBest < otherBest ? 'close' : 'wrong';
}
