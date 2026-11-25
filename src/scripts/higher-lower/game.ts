// Higher or lower: is the next country's figure higher or lower than the current one's? An endless
// streak that ends at the first wrong answer. Markup: src/pages/quizzes/higher-lower.astro.
import { continents, countries, nameInSentence, type Continent, type Country } from '../../data/countries';
import { checkedValues, renderBest, renderSummary, setChecked, wireSettingsDialog } from '../settings-dialog';
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from './categories';
import { withMark } from '../marks';

/** How long a right answer's figure stays on screen before the next pair, in ms. */
const ADVANCE_DELAY = 1400;
const ID = 'higher-lower';

export const DIFFICULTIES = ['any', 'close'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Settings {
  category: CategoryId;
  continents: Continent[];
  difficulty: Difficulty;
}

export const DEFAULT_SETTINGS: Settings = { category: 'population', continents: [...continents], difficulty: 'any' };

// Settings and best streaks are saved in this browser only. Storage can be blocked (private windows),
// so every read falls back to the defaults and every write may silently fail.
function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(`${ID}:settings`) ?? 'null') as Partial<Settings> | null;
    const picked = continents.filter((c) => saved?.continents?.includes(c));
    return {
      category: CATEGORY_IDS.find((id) => id === saved?.category) ?? DEFAULT_SETTINGS.category,
      continents: picked.length ? picked : DEFAULT_SETTINGS.continents,
      difficulty: DIFFICULTIES.find((d) => d === saved?.difficulty) ?? DEFAULT_SETTINGS.difficulty,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not saved; the game still works.
  }
}

/** Best streaks are kept per category, difficulty and continents. */
const bestKey = (s: Settings): string =>
  `${ID}:best:${s.category}:${s.difficulty}:${[...s.continents].sort().join(',')}`;

function readBest(s: Settings): number | null {
  try {
    const value = Number(localStorage.getItem(bestKey(s)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

const randomItem = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export function initHigherLower(root: HTMLElement): void {
  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Higher or lower: missing ${sel}`);
    return el;
  };

  const flags = JSON.parse(root.dataset.flags ?? '{}') as Record<string, string>;
  const screens = {
    start: $('[data-screen="start"]'),
    play: $('[data-screen="play"]'),
    results: $('[data-screen="results"]'),
  };
  const settingsForm = $<HTMLFormElement>('[data-settings]');
  const summaryEls = root.querySelectorAll<HTMLElement>('[data-summary]');
  const bestEl = $('[data-best]');
  const streakEl = $('[data-streak]');
  const questionEl = $('[data-question]');
  const announceEl = $('[data-announce]');
  const guessGroup = $('[data-guess-group]');
  const higherBtn = $<HTMLButtonElement>('[data-higher]');
  const lowerBtn = $<HTMLButtonElement>('[data-lower]');
  const higherLabel = $('[data-higher] [data-label]');
  const lowerLabel = $('[data-lower] [data-label]');
  const continueBtn = $<HTMLButtonElement>('[data-continue]');
  const giveUpBtn = $<HTMLButtonElement>('[data-give-up]');
  const feedback = $('[data-feedback]');
  const resultTitle = $('[data-result-title]');
  const resultBest = $('[data-result-best]');
  const resultLast = $('[data-result-last]');

  const card = (side: 'left' | 'right') => ({
    flag: $<HTMLImageElement>(`[data-card="${side}"] [data-card-flag]`),
    name: $(`[data-card="${side}"] [data-card-name]`),
    value: $(`[data-card="${side}"] [data-card-value]`),
    detail: $(`[data-card="${side}"] [data-card-detail]`),
  });
  const cards = { left: card('left'), right: card('right') };

  let settings = loadSettings();
  let left: Country | undefined;
  let right: Country | undefined;
  /**
   * The country that comes in next if this answer is right, picked early so its flag is already
   * downloaded and decoded by the time it slides in.
   */
  let upcoming: Country | undefined;
  let streak = 0;
  /** Countries used this game, so pairs don't repeat until the pool runs out. */
  let used = new Set<string>();
  let revealing = false;
  let advanceTimer: number | undefined;

  const category = () => CATEGORIES[settings.category];
  const valueOf = (country: Country): number => category().value(country) ?? 0;
  const show = (name: keyof typeof screens): void => {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  };
  // US English formatting for its Oxford comma ("Europe, Asia, and Africa"); the en-GB format leaves it out.
  const listFormat = new Intl.ListFormat('en-US', { type: 'conjunction' });

  /** The countries this game can use: on the chosen continents and with a figure for the category. */
  const pool = (): Country[] =>
    countries.filter((c) => settings.continents.includes(c.continent) && category().value(c) !== undefined);

  // Settings
  function applySettings(): void {
    setChecked(settingsForm, 'category', [settings.category]);
    setChecked(settingsForm, 'continent', settings.continents);
    setChecked(settingsForm, 'difficulty', [settings.difficulty]);
  }

  function readSettingsForm(): Settings {
    const [categoryId] = checkedValues(settingsForm, 'category');
    const [difficulty] = checkedValues(settingsForm, 'difficulty');
    const picked = checkedValues(settingsForm, 'continent');
    return {
      category: CATEGORY_IDS.find((id) => id === categoryId) ?? DEFAULT_SETTINGS.category,
      continents: continents.filter((c) => picked.includes(c)),
      difficulty: DIFFICULTIES.find((d) => d === difficulty) ?? DEFAULT_SETTINGS.difficulty,
    };
  }

  /** The summary tags: ["Population", "All continents"], ["Area", "Europe and Asia", "Close calls"]. */
  function describe(): string[] {
    const everywhere = settings.continents.length === continents.length;
    return [
      category().label,
      everywhere ? 'All continents' : listFormat.format(settings.continents),
      ...(settings.difficulty === 'close' ? ['Close calls'] : []),
    ];
  }

  function updateSummary(): void {
    const none = settings.continents.length === 0;
    summaryEls.forEach((el) => renderSummary(el, none ? 'Pick at least one continent.' : describe()));
    const best = none ? null : readBest(settings);
    renderBest(
      bestEl,
      best === null ? null : { shown: `Best streak ${best}`, spoken: `Your best streak with these settings: ${best}` },
    );
  }

  // Game
  /** A new country to compare with `against`: unused this game, and close in value when asked. */
  function pickNext(against: Country): Country {
    const available = pool().filter((c) => c.code !== against.code);
    let fresh = available.filter((c) => !used.has(c.code));
    if (!fresh.length) {
      used = new Set([against.code]);
      fresh = available;
    }
    if (settings.difficulty === 'close') {
      const base = valueOf(against);
      const near = fresh.filter((c) => {
        const v = valueOf(c);
        return Math.max(v, base) / Math.max(Math.min(v, base), 1e-9) <= category().closeRatio;
      });
      if (near.length) fresh = near;
    }
    const next = randomItem(fresh);
    used.add(next.code);
    return next;
  }

  /** Fetches and decodes a flag in the background, so showing it later is instant. */
  function preload(country: Country): void {
    const img = new Image();
    img.src = flags[country.code] ?? '';
    img.decode().catch(() => undefined);
  }

  /** Picks the country after `right` now, while the player is still deciding, and preloads its flag. */
  function prepareUpcoming(): void {
    if (!right) return;
    upcoming = pickNext(right);
    preload(upcoming);
  }

  function fillCard(side: 'left' | 'right', country: Country, reveal: boolean): void {
    const el = cards[side];
    el.flag.src = flags[country.code] ?? '';
    el.name.textContent = country.name;
    el.value.textContent = reveal ? category().format(valueOf(country)) : '?';
    // Only some categories have a detail line (the peak's name). For those, it keeps its space while
    // empty so the card doesn't jump when it fills in; for the rest it's removed entirely.
    el.detail.hidden = !category().detail;
    el.detail.textContent = reveal ? (category().detail?.(country) ?? '') : '';
  }

  function start(): void {
    window.clearTimeout(advanceTimer);
    const countriesAvailable = pool();
    if (countriesAvailable.length < 2) return;
    streak = 0;
    used = new Set();
    left = randomItem(countriesAvailable);
    used.add(left.code);
    right = pickNext(left);
    show('play');
    showPair();
    prepareUpcoming();
  }

  function showPair(): void {
    if (!left || !right) return;
    revealing = false;
    streakEl.textContent = String(streak);
    fillCard('left', left, true);
    fillCard('right', right, false);
    higherLabel.textContent = category().higherLabel;
    lowerLabel.textContent = category().lowerLabel;
    [higherBtn, lowerBtn].forEach((btn) => btn.removeAttribute('aria-disabled'));
    continueBtn.hidden = true;
    setFeedback('');
    const question = category().question(left, right);
    questionEl.textContent = question;
    // The buttons don't change between pairs, so tell screen readers about the new question.
    announceEl.textContent = `Streak ${streak}. ${question}`;
    // Focus the group, not a button, so no focus ring appears until the player presses Tab.
    guessGroup.focus();
  }

  function setFeedback(message: string, tone?: 'right' | 'wrong'): void {
    // Right and wrong get the pixel tick or cross before the message.
    feedback.replaceChildren(tone ? withMark(tone === 'right' ? 'tick' : 'cross', message) : message);
    feedback.classList.toggle('text-accent', tone === 'right');
    feedback.classList.toggle('text-wrong', tone === 'wrong');
  }

  function guess(direction: 'higher' | 'lower'): void {
    if (revealing || !left || !right) return;
    revealing = true;
    [higherBtn, lowerBtn].forEach((btn) => btn.setAttribute('aria-disabled', 'true'));
    fillCard('right', right, true);

    const a = category().rounded(valueOf(left));
    const b = category().rounded(valueOf(right));
    // A tie counts as right: neither answer is wrong.
    const correct = a === b || (direction === 'higher' ? b > a : b < a);
    const figure = `${right.name}: ${category().format(valueOf(right))}`;

    if (correct) {
      streak++;
      streakEl.textContent = String(streak);
      setFeedback(a === b ? `A tie! ${figure}.` : `Correct! ${figure}.`, 'right');
      const next = right;
      advanceTimer = window.setTimeout(() => {
        left = next;
        right = upcoming ?? pickNext(next);
        showPair();
        prepareUpcoming();
      }, ADVANCE_DELAY);
      return;
    }

    const actual = b > a ? category().higherLabel : category().lowerLabel;
    setFeedback(`${figure}. That's ${actual.toLowerCase()} than ${nameInSentence(left)}.`, 'wrong');
    continueBtn.hidden = false;
    continueBtn.focus();
  }

  // Giving up and results
  /** Ends the game, showing the hidden figure so the last pair is complete. */
  function giveUp(): void {
    if (right && !revealing) fillCard('right', right, true);
    finish();
  }

  function finish(): void {
    window.clearTimeout(advanceTimer);
    const previous = readBest(settings);
    const isBest = streak > 0 && (previous === null || streak > previous);
    if (isBest) save(bestKey(settings), String(streak));

    resultTitle.textContent = streak === 0 ? 'No streak this time' : `You got ${streak} in a row`;
    renderBest(
      resultBest,
      isBest
        ? { shown: 'New best streak!', spoken: 'New best streak!' }
        : previous
          ? { shown: `Best streak ${previous}`, spoken: `Your best streak: ${previous}` }
          : null,
    );
    resultLast.textContent =
      left && right
        ? `Last pair: ${left.name}, ${category().format(valueOf(left))} · ${right.name}, ${category().format(valueOf(right))}`
        : '';
    show('results');
    resultTitle.focus();
    updateSummary();
  }

  const dialog = wireSettingsDialog(root, {
    onChange() {
      settings = readSettingsForm();
      if (settings.continents.length) save(`${ID}:settings`, JSON.stringify(settings));
      updateSummary();
    },
    onRevert() {
      settings = loadSettings();
      applySettings();
      updateSummary();
    },
  });

  higherBtn.addEventListener('click', () => guess('higher'));
  lowerBtn.addEventListener('click', () => guess('lower'));
  continueBtn.addEventListener('click', finish);
  giveUpBtn.addEventListener('click', giveUp);
  $('[data-start]').addEventListener('click', start);
  $('[data-again]').addEventListener('click', start);

  applySettings();
  dialog.refresh();
  updateSummary();
}
