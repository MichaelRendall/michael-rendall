// Flag quiz: show a flag, the player types the country. Guesses are unlimited and the player can move between
// the flags they haven't named yet. The game ends when every flag is named or the player gives up.
// See src/pages/flag-quiz.astro for the markup.
import { continents, countries, type Country } from '../../data/countries';
import { check, type Verdict } from './match';
import {
  DEFAULT_SETTINGS,
  LENGTHS,
  loadSettings,
  poolFor,
  readBest,
  saveBest,
  saveSettings,
  totalFor,
  type Settings,
} from './settings';

/** How long a right answer stays on screen before the next flag, in ms. */
const ADVANCE_DELAY = 1200;
/** How long "Give up" waits for the confirming second click, in ms. */
const GIVE_UP_CONFIRM = 3000;

/** Random pick of `count` items, no repeats (Fisher–Yates on a copy). */
function pick<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function initQuiz(root: HTMLElement): void {
  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Flag quiz: missing ${sel}`);
    return el;
  };

  const flags = JSON.parse(root.dataset.flags ?? '{}') as Record<string, string>;
  const screens = {
    start: $('[data-screen="start"]'),
    play: $('[data-screen="play"]'),
    results: $('[data-screen="results"]'),
  };
  const settingsDialog = $<HTMLDialogElement>('[data-settings-dialog]');
  const settingsForm = $<HTMLFormElement>('[data-settings]');
  const selectAllBtn = $<HTMLButtonElement>('[data-select-all]');
  const clearBtn = $<HTMLButtonElement>('[data-clear]');
  const summaryEls = root.querySelectorAll<HTMLElement>('[data-summary]');
  const bestEl = $('[data-best]');
  const roundEl = $('[data-round]');
  const totalEl = $('[data-total]');
  const scoreEl = $('[data-score]');
  const flagImg = $<HTMLImageElement>('[data-flag]');
  const form = $<HTMLFormElement>('[data-form]');
  const input = $<HTMLInputElement>('[data-guess]');
  const prevBtn = $<HTMLButtonElement>('[data-prev]');
  const nextBtn = $<HTMLButtonElement>('[data-next]');
  const giveUpBtn = $<HTMLButtonElement>('[data-give-up]');
  const giveUpLabel = giveUpBtn.innerHTML;
  const feedback = $('[data-feedback]');
  const resultTitle = $('[data-result-title]');
  const resultBest = $('[data-result-best]');
  const missedWrap = $('[data-missed-wrap]');
  const missedList = $<HTMLUListElement>('[data-missed]');

  let settings: Settings = loadSettings();
  let round: Country[] = [];
  /** Indexes into `round` of the flags named so far. */
  let solved = new Set<number>();
  let current = 0;
  let advanceTimer: number | undefined;
  let giveUpTimer: number | undefined;

  const show = (name: keyof typeof screens): void => {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  };

  const preload = (country: Country | undefined): void => {
    if (country) new Image().src = flags[country.code] ?? '';
  };

  const listFormat = new Intl.ListFormat('en-GB', { type: 'conjunction' });

  // Settings form <-> settings object
  const lengthInputs = settingsForm.querySelectorAll<HTMLInputElement>('input[name="length"]');
  const continentInputs = settingsForm.querySelectorAll<HTMLInputElement>('input[name="continent"]');

  function applySettings(): void {
    lengthInputs.forEach((el) => (el.checked = el.value === String(settings.length)));
    continentInputs.forEach((el) => (el.checked = settings.continents.some((c) => c === el.value)));
  }

  function readSettingsForm(): Settings {
    const checkedLength = Array.from(lengthInputs).find((el) => el.checked)?.value;
    return {
      length: LENGTHS.find((option) => String(option) === checkedLength) ?? DEFAULT_SETTINGS.length,
      continents: continents.filter((c) => Array.from(continentInputs).some((el) => el.checked && el.value === c)),
    };
  }

  /** "10 flags from all continents", "All 14 flags from Oceania", "20 flags from Europe and Asia (95 countries)". */
  function describe(): string {
    const total = totalFor(settings);
    const available = poolFor(settings).length;
    const everywhere = settings.continents.length === continents.length;
    const where = everywhere ? 'all continents' : listFormat.format(settings.continents);
    if (total === available) return `All ${total} flags from ${where}`;
    return everywhere ? `${total} flags from ${where}` : `${total} flags from ${where} (${available} countries)`;
  }

  function updateSummary(): void {
    const none = settings.continents.length === 0;
    const all = settings.continents.length === continents.length;
    selectAllBtn.disabled = all;
    clearBtn.disabled = none;
    summaryEls.forEach((el) => (el.textContent = none ? 'Pick at least one continent.' : describe()));
    if (none) {
      bestEl.hidden = true;
      return;
    }
    const total = totalFor(settings);
    const best = readBest(settings);
    bestEl.hidden = best === null;
    bestEl.textContent = best === null ? '' : `Your best with these settings: ${best} out of ${total}`;
  }

  // Game
  function start(): void {
    window.clearTimeout(advanceTimer);
    round = pick(poolFor(settings), totalFor(settings));
    solved = new Set();
    totalEl.textContent = String(round.length);
    scoreEl.textContent = '0';
    show('play');
    showFlag(0);
  }

  /** The nearest flag not yet named, stepping forwards (1) or backwards (-1) and wrapping round. */
  function findUnsolved(direction: 1 | -1): number | null {
    for (let step = 1; step < round.length; step++) {
      const index = (current + direction * step + round.length) % round.length;
      if (!solved.has(index)) return index;
    }
    return null;
  }

  function showFlag(index: number): void {
    window.clearTimeout(advanceTimer);
    resetGiveUp();
    current = index;
    roundEl.textContent = String(index + 1);
    flagImg.src = flags[round[index].code] ?? '';
    setFeedback('');
    input.value = '';
    input.readOnly = false;

    const upcoming = findUnsolved(1);
    preload(upcoming === null ? undefined : round[upcoming]);
    // With one flag left there's nowhere to move to.
    prevBtn.disabled = upcoming === null;
    nextBtn.disabled = upcoming === null;
    input.focus();
  }

  function move(direction: 1 | -1): void {
    const index = findUnsolved(direction);
    if (index !== null) showFlag(index);
  }

  function setFeedback(message: string, tone?: 'right' | 'wrong'): void {
    feedback.textContent = message;
    feedback.classList.toggle('text-accent', tone === 'right');
    feedback.classList.toggle('text-wrong', tone === 'wrong');
  }

  function accept(verdict: Exclude<Verdict, 'wrong'>): void {
    const country = round[current];
    solved.add(current);
    scoreEl.textContent = String(solved.size);
    setFeedback(
      verdict === 'correct' ? `✓ Correct! It's ${country.name}.` : `✓ Close enough! It's spelled ${country.name}.`,
      'right',
    );
    // Read-only rather than disabled keeps focus in the box, so the phone keyboard stays open for the next flag.
    input.readOnly = true;
    const done = solved.size === round.length;
    advanceTimer = window.setTimeout(() => (done ? finish() : move(1)), ADVANCE_DELAY);
  }

  function resetGiveUp(): void {
    window.clearTimeout(giveUpTimer);
    giveUpTimer = undefined;
    giveUpBtn.innerHTML = giveUpLabel;
  }

  /** The first click asks for confirmation, so a stray click can't end a long game. */
  function giveUp(): void {
    if (giveUpTimer === undefined) {
      giveUpBtn.textContent = 'Sure? Click again';
      giveUpTimer = window.setTimeout(resetGiveUp, GIVE_UP_CONFIRM);
      return;
    }
    finish();
  }

  function finish(): void {
    window.clearTimeout(advanceTimer);
    resetGiveUp();
    const total = round.length;
    const score = solved.size;
    const previous = readBest(settings);
    const isBest = score > 0 && (previous === null || score > previous);
    if (isBest) saveBest(settings, score);

    resultTitle.textContent = score === total ? `You got all ${total}!` : `You got ${score} out of ${total}`;
    resultBest.textContent = isBest ? '✦ New best score! ✦' : previous ? `Your best: ${previous} out of ${total}` : '';

    const missed = round.filter((_, index) => !solved.has(index));
    missedWrap.hidden = missed.length === 0;
    missedList.replaceChildren(
      ...missed.map((country) => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-3';
        const img = document.createElement('img');
        img.src = flags[country.code] ?? '';
        img.alt = '';
        img.width = 48;
        img.height = 36;
        img.className = 'aspect-4/3 w-12 shrink-0 border-2 border-ink object-cover';
        const name = document.createElement('span');
        name.className = 'font-semibold';
        name.textContent = country.name;
        li.append(img, name);
        return li;
      }),
    );

    show('results');
    resultTitle.focus();
    updateSummary();
  }

  // Settings dialog. Changes apply as you make them. Only valid settings (at least one continent) are saved.
  function settingsChanged(): void {
    settings = readSettingsForm();
    if (settings.continents.length) saveSettings(settings);
    updateSummary();
  }
  const setAllContinents = (checked: boolean): void => {
    continentInputs.forEach((el) => (el.checked = checked));
    settingsChanged();
    continentInputs[0]?.focus();
  };

  root.querySelectorAll('[data-open-settings]').forEach((el) =>
    el.addEventListener('click', () => {
      settingsDialog.showModal();
      settingsForm.querySelector<HTMLInputElement>('input:checked')?.focus();
    }),
  );
  settingsForm.addEventListener('change', settingsChanged);
  selectAllBtn.addEventListener('click', () => setAllContinents(true));
  clearBtn.addEventListener('click', () => setAllContinents(false));
  // "Done" needs a continent picked. Closing any other way (Escape, the × button) goes back to the last saved settings.
  settingsForm.addEventListener('submit', (event) => {
    if (settings.continents.length) return;
    event.preventDefault();
    continentInputs[0]?.focus();
  });
  $('[data-settings-close]').addEventListener('click', () => settingsDialog.close());
  settingsDialog.addEventListener('close', () => {
    if (settings.continents.length) return;
    settings = loadSettings();
    applySettings();
    updateSummary();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (input.readOnly) return;
    const guess = input.value.trim();
    if (!guess) {
      setFeedback('Type a country name, or press Next.');
      input.focus();
      return;
    }
    // Checked against every country, not just the pool, so a near miss on an excluded country still isn't "close".
    const verdict = check(guess, round[current], countries);
    if (verdict !== 'wrong') return accept(verdict);
    setFeedback('✗ Not quite. Try again, or move on with Next.', 'wrong');
    input.select();
  });
  // Accept an exact match as soon as it's typed. Typos still need Enter, so a half-typed name never counts.
  input.addEventListener('input', () => {
    const country = round[current];
    if (country && !input.readOnly && check(input.value, country, countries) === 'correct') accept('correct');
  });
  prevBtn.addEventListener('click', () => move(-1));
  nextBtn.addEventListener('click', () => move(1));
  giveUpBtn.addEventListener('click', giveUp);
  $('[data-start]').addEventListener('click', start);
  $('[data-again]').addEventListener('click', start);

  applySettings();
  updateSummary();
}
