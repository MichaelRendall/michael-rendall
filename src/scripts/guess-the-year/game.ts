// Guess the Year: estimate the year of each event. 5 points for spot on, 3 within 2 years, 1 within 5.
// Solo is one player against their best score; Party passes the phone so each player locks in a secret
// guess, then reveals everyone's together. Markup: src/pages/quizzes/guess-the-year.astro.
import { CATEGORIES, CATEGORY_LABELS } from '../../data/guess-the-year';
import { wirePlayerList } from '../player-list';
import { GameClock, formatClock } from '../quiz/clock';
import { beats, countdownSeconds, type Best } from '../quiz/settings';
import { checkedValues, renderBest, renderSummary, setChecked, wireSettingsDialog } from '../settings-dialog';
import {
  DEFAULT_SETTINGS,
  ERAS,
  LENGTHS,
  MAX_PLAYERS,
  MAX_POINTS,
  MIN_PLAYERS,
  MODES,
  PLAYER_NAME_MAX,
  TIMERS,
  bestKey,
  describe,
  loadSettings,
  playerName,
  pointsFor,
  poolFor,
  rangeFor,
  saveSettings,
  totalFor,
  type Question,
  type Settings,
} from './settings';

/** Where the year starts for each question: a neutral middle, not a hint. */
const START_YEAR: Record<Settings['era'], number> = { all: 1950, '1900': 1960, '1980': 2003 };

const shuffle = <T>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function readBest(key: string): Best | null {
  try {
    const best = JSON.parse(localStorage.getItem(key) ?? 'null') as Best | null;
    return best && Number.isInteger(best.score) && best.score > 0 ? best : null;
  } catch {
    return null;
  }
}

function saveBest(key: string, best: Best): void {
  try {
    localStorage.setItem(key, JSON.stringify(best));
  } catch {
    // Not saved; the game still works.
  }
}

export function initGuessTheYear(root: HTMLElement): void {
  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Guess the Year: missing ${sel}`);
    return el;
  };

  const screens = {
    start: $('[data-screen="start"]'),
    pass: $('[data-screen="pass"]'),
    guess: $('[data-screen="guess"]'),
    reveal: $('[data-screen="reveal"]'),
    results: $('[data-screen="results"]'),
  };
  const settingsForm = $<HTMLFormElement>('[data-settings]');
  const summaryEls = root.querySelectorAll<HTMLElement>('[data-summary]');
  const bestEl = $('[data-best]');
  const playersField = $('[data-player-list]');
  const timerField = $('[data-timer-field]');
  const passTitle = $('[data-pass-title]');
  const progressEl = $('[data-progress]');
  const clockWrap = $('[data-clock-wrap]');
  const clockTrack = $('[data-clock-track]');
  const clockBar = $('[data-clock-bar]');
  const clockEl = $('[data-clock]');
  const clockAnnounce = $('[data-clock-announce]');
  const promptCategory = $('[data-prompt-category]');
  const promptEl = $('[data-prompt]');
  const yearInput = $<HTMLInputElement>('[data-year-input]');
  const slider = $<HTMLInputElement>('[data-year-slider]');
  const revealTitle = $('[data-reveal-title]');
  const revealPrompt = $('[data-reveal-prompt]');
  const revealRows = $<HTMLTableSectionElement>('[data-reveal-rows]');
  const nextBtn = $<HTMLButtonElement>('[data-next]');
  const resultTitle = $('[data-result-title]');
  const resultBest = $('[data-result-best]');
  const resultList = $<HTMLUListElement>('[data-result-list]');
  const scoreboards = root.querySelectorAll<HTMLOListElement>('[data-scoreboard]');

  let settings = loadSettings();
  let questions: Question[] = [];
  let index = 0;
  let player = 0;
  /** guesses[question][player]. */
  let guesses: number[][] = [];
  let scores: number[] = [];
  let range: [number, number] = rangeFor(settings);
  let timedOut = false;
  let pausedWhileHidden = false;
  let announced = new Set<number>();

  const party = (): boolean => settings.mode === 'party';
  const playerCount = (): number => (party() ? settings.players.length : 1);
  // Solo plays as a party of one, called "You".
  const name = (p: number): string => (party() ? playerName(settings, p) : 'You');

  function show(screen: keyof typeof screens, focus?: HTMLElement): void {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== screen;
    focus?.focus();
  }

  // Settings
  const playerList = wirePlayerList(settingsForm, { min: MIN_PLAYERS, max: MAX_PLAYERS }, settingsChanged);

  function applySettings(): void {
    setChecked(settingsForm, 'length', [String(settings.length)]);
    setChecked(settingsForm, 'category', settings.categories);
    setChecked(settingsForm, 'era', [settings.era]);
    setChecked(settingsForm, 'mode', [settings.mode]);
    setChecked(settingsForm, 'timer', [settings.timer]);
    playerList.set(settings.players);
    applyMode();
  }

  /** Party needs player names; the timer is for Solo. */
  function applyMode(): void {
    playersField.hidden = !party();
    timerField.hidden = party();
  }

  function readSettingsForm(): Settings {
    const one = (field: string): string | undefined => checkedValues(settingsForm, field)[0];
    const picked = checkedValues(settingsForm, 'category');
    return {
      length: LENGTHS.find((o) => String(o) === one('length')) ?? DEFAULT_SETTINGS.length,
      categories: CATEGORIES.filter((c) => picked.includes(c)),
      era: ERAS.find((o) => o === one('era')) ?? DEFAULT_SETTINGS.era,
      mode: MODES.find((o) => o === one('mode')) ?? DEFAULT_SETTINGS.mode,
      players: playerList.names().map((p) => p.slice(0, PLAYER_NAME_MAX)),
      timer: TIMERS.find((o) => o === one('timer')) ?? DEFAULT_SETTINGS.timer,
    };
  }

  function updateSummary(): void {
    const none = settings.categories.length === 0;
    summaryEls.forEach((el) => renderSummary(el, none ? 'Pick at least one category.' : describe(settings)));
    const best = none || party() ? null : readBest(bestKey(settings));
    renderBest(
      bestEl,
      best === null
        ? null
        : {
            shown: `Best ${best.score} / ${totalFor(settings) * MAX_POINTS}${best.seconds === undefined ? '' : ` in ${formatClock(best.seconds)}`}`,
            spoken: `Your best with these settings: ${best.score} points out of ${totalFor(settings) * MAX_POINTS}`,
          },
    );
  }

  function settingsChanged(): void {
    settings = readSettingsForm();
    if (settings.categories.length) saveSettings(settings);
    applyMode();
    updateSummary();
  }

  // The year control: a big typed year, a slider to get close, and buttons to nudge it.
  function setYear(value: number): void {
    const year = Math.round(Math.min(range[1], Math.max(range[0], value)));
    yearInput.value = String(year);
    slider.value = String(year);
    slider.setAttribute('aria-valuetext', String(year));
  }
  const currentYear = (): number => Number(slider.value);

  // Timer, Solo only. Paused while an answer is revealed and while the page is hidden.
  const clock = new GameClock((elapsedMs) => {
    const limit = countdownSeconds(settings.timer);
    const elapsed = elapsedMs / 1000;
    if (limit === null) {
      clockEl.textContent = formatClock(elapsed);
      return;
    }
    const left = Math.max(0, limit - elapsed);
    const whole = Math.ceil(left);
    clockEl.textContent = formatClock(whole);
    clockBar.style.width = `${(left / limit) * 100}%`;
    clockBar.classList.toggle('bg-pink', whole <= 10);
    clockBar.classList.toggle('bg-teal', whole > 10);
    for (const mark of [60, 10]) {
      if (whole <= mark && limit > mark && !announced.has(mark)) {
        announced.add(mark);
        clockAnnounce.textContent = mark === 60 ? '1 minute left' : '10 seconds left';
      }
    }
    if (left <= 0) {
      timedOut = true;
      clockAnnounce.textContent = "Time's up";
      showResults();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && clock.running) {
      clock.pause();
      pausedWhileHidden = true;
    } else if (!document.hidden && pausedWhileHidden) {
      pausedWhileHidden = false;
      if (!screens.guess.hidden) clock.resume();
    }
  });

  // Game
  function startGame(): void {
    questions = shuffle(poolFor(settings)).slice(0, totalFor(settings));
    range = rangeFor(settings);
    yearInput.min = slider.min = String(range[0]);
    yearInput.max = slider.max = String(range[1]);
    index = 0;
    guesses = questions.map(() => []);
    scores = Array.from({ length: playerCount() }, () => 0);
    timedOut = false;
    pausedWhileHidden = false;
    announced = new Set();
    const timed = !party() && settings.timer !== 'off';
    clockWrap.hidden = !timed;
    clockTrack.hidden = countdownSeconds(settings.timer) === null;
    clockAnnounce.textContent = '';
    if (timed) clock.start();
    else clock.stop();
    startQuestion();
  }

  function startQuestion(): void {
    player = 0;
    if (party()) showPass();
    else showGuess();
  }

  function showPass(): void {
    passTitle.textContent = `Pass to ${name(player)}`;
    show('pass', passTitle);
  }

  function showGuess(): void {
    const question = questions[index];
    const position = `${index + 1} / ${questions.length}`;
    progressEl.textContent = party() ? `${position} · ${name(player)}` : `${position} · Score ${scores[0]}`;
    promptCategory.textContent = CATEGORY_LABELS[question.category];
    promptEl.textContent = question.text;
    setYear(START_YEAR[settings.era]);
    if (!party() && settings.timer !== 'off' && !document.hidden) clock.resume();
    show('guess', promptEl);
  }

  function lockIn(): void {
    // Typed years are taken as typed, kept within the slider's range.
    setYear(Number(yearInput.value) || currentYear());
    guesses[index][player] = currentYear();
    player++;
    if (player < playerCount()) showPass();
    else reveal();
  }

  function reveal(): void {
    clock.pause();
    const question = questions[index];
    const points = guesses[index].map((guess) => pointsFor(guess, question.year));
    points.forEach((p, i) => (scores[i] += p));
    revealTitle.textContent = String(question.year);
    showPartyLists();
    revealPrompt.textContent = question.text;

    // Closest first.
    const order = guesses[index]
      .map((guess, p) => ({ p, guess, off: Math.abs(guess - question.year) }))
      .sort((a, b) => a.off - b.off);
    // One row per player, closest first: name, guess, points. Pink cells like the round's other rows.
    revealRows.replaceChildren(
      ...order.map(({ p, guess }) => {
        const row = document.createElement('tr');
        const cells = [name(p), String(guess), `+${pointsFor(guess, question.year)}`];
        row.append(
          ...cells.map((text, i) => {
            const cell = document.createElement(i === 0 ? 'th' : 'td');
            if (i === 0) cell.setAttribute('scope', 'row');
            cell.className = [
              'bg-blush px-3 py-1 text-left font-normal',
              i === 1 ? 'tabular-nums' : '',
              i === 2 ? 'text-right font-semibold tabular-nums' : '',
            ].join(' ');
            cell.textContent = text;
            return cell;
          }),
        );
        return row;
      }),
    );
    renderScoreboards();
    nextBtn.textContent = index + 1 < questions.length ? 'Next question' : 'See results';
    show('reveal', revealTitle);
  }

  function next(): void {
    index++;
    if (index < questions.length) startQuestion();
    else showResults();
  }

  /** The final results' total table is for Party only; Solo's headline already gives the score. */
  function showPartyLists(): void {
    root.querySelectorAll<HTMLElement>('[data-party-only]').forEach((el) => (el.hidden = !party()));
  }

  function renderScoreboards(): void {
    showPartyLists();
    const best = Math.max(...scores);
    // Highest first; players on the same score keep their order from Settings.
    const ranked = scores.map((score, p) => ({ score, p })).sort((a, b) => b.score - a.score || a.p - b.p);
    scoreboards.forEach((list) => {
      list.replaceChildren(
        ...ranked.map(({ score, p }) => {
          const li = document.createElement('li');
          // Lilac, unlike this round's pink rows, so the running totals read as a separate table.
          li.className = 'flex justify-between gap-6 bg-lilac-mist px-3 py-1';
          if (score === best && best > 0) li.classList.add('font-semibold');
          const who = document.createElement('span');
          who.textContent = name(p);
          const total = document.createElement('span');
          total.className = 'tabular-nums';
          total.textContent = `${score} ${score === 1 ? 'point' : 'points'}`;
          li.append(who, total);
          return li;
        }),
      );
    });
  }

  function showResults(): void {
    clock.stop();
    pausedWhileHidden = false;
    const answered = guesses.filter((g) => g.length === playerCount()).length;

    if (party()) {
      const best = Math.max(...scores);
      const winners = scores.flatMap((score, p) => (score === best ? [name(p)] : []));
      resultTitle.textContent =
        best === 0
          ? 'No points scored'
          : winners.length === 1
            ? `${winners[0]} wins!`
            : `${new Intl.ListFormat('en-US', { type: 'conjunction' }).format(winners)} tie!`;
      renderBest(resultBest, null);
    } else {
      const score = scores[0];
      const max = questions.length * MAX_POINTS;
      const seconds = Math.floor(clock.elapsedMs() / 1000);
      const result: Best = settings.timer === 'stopwatch' ? { score, seconds } : { score };
      const previous = readBest(bestKey(settings));
      const isBest = beats(result, previous);
      if (isBest) saveBest(bestKey(settings), result);
      const scored = `You scored ${score} out of ${max}`;
      resultTitle.textContent = timedOut
        ? `Time's up! ${scored}`
        : settings.timer === 'stopwatch'
          ? `${scored} in ${formatClock(seconds)}`
          : scored;
      const previousTime = previous?.seconds === undefined ? '' : ` in ${formatClock(previous.seconds)}`;
      renderBest(
        resultBest,
        isBest
          ? { shown: 'New best!', spoken: 'New best score!' }
          : previous
            ? {
                shown: `Best ${previous.score} / ${max}${previousTime}`,
                spoken: `Your best: ${previous.score} out of ${max}${previousTime}`,
              }
            : null,
      );
    }

    // Every question answered: the year, and each guess with its points.
    resultList.replaceChildren(
      ...questions.slice(0, answered).map((question, q) => {
        const li = document.createElement('li');
        li.className = 'flex flex-col bg-blush px-3 py-1.5';
        const what = document.createElement('span');
        what.className = 'font-semibold';
        what.textContent = `${question.year}: ${question.text}`;
        const how = document.createElement('span');
        how.className = 'text-body-sm text-ink-soft';
        how.textContent = guesses[q]
          .map((guess, p) => `${party() ? `${name(p)} ` : 'You said '}${guess} (+${pointsFor(guess, question.year)})`)
          .join(' · ');
        li.append(what, how);
        return li;
      }),
    );
    renderScoreboards();
    show('results', resultTitle);
    updateSummary();
  }

  // Settings dialog
  const dialog = wireSettingsDialog(
    root,
    {
      onChange: settingsChanged,
      onRevert() {
        settings = loadSettings();
        applySettings();
        updateSummary();
      },
    },
    'category',
  );

  // Play
  $('[data-start]').addEventListener('click', startGame);
  $('[data-pass-ready]').addEventListener('click', showGuess);
  slider.addEventListener('input', () => setYear(Number(slider.value)));
  // Typing updates the slider once it looks like a whole year; the range is enforced on Lock in.
  yearInput.addEventListener('input', () => {
    const typed = Number(yearInput.value);
    if (yearInput.value.length >= 4 && typed >= range[0] && typed <= range[1]) slider.value = String(typed);
  });
  root
    .querySelectorAll<HTMLButtonElement>('[data-nudge]')
    .forEach((button) => button.addEventListener('click', () => setYear(currentYear() + Number(button.dataset.nudge))));
  $<HTMLFormElement>('[data-guess-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    lockIn();
  });
  nextBtn.addEventListener('click', next);
  root.querySelectorAll('[data-end-game]').forEach((button) => button.addEventListener('click', showResults));
  $('[data-again]').addEventListener('click', startGame);

  applySettings();
  dialog.refresh();
  updateSummary();
}
