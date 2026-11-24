// The shared quiz engine. It runs the start, play and results screens and the settings dialog
// for any quiz, driven by a QuizDefinition. Markup: src/components/quiz/Quiz.astro.
//
// Two modes (a quiz offers one or both; see QuizDefinition.modes):
// - type: the player types the answer. A right answer is accepted the moment it's typed. Tries are unlimited,
//   and Previous and Next move between the questions not yet answered.
// - choice: the player taps one of four options. One tap per question, in order. A wrong tap shows the
//   right answer and waits for "Next question".
// Either way the game ends when every question is done, or when the player gives up.
import { continents, countries, type Country } from '../../data/countries';
import { MODE_LABELS, shuffle, type Mode, type QuizDefinition } from './definition';
import {
  defaultSettings,
  LENGTHS,
  loadSettings,
  poolFor,
  readBest,
  saveBest,
  saveSettings,
  totalFor,
  type Settings,
} from './settings';
import { checkedValues, renderBest, renderSummary, setChecked, wireSettingsDialog } from '../settings-dialog';

/** How long a right answer stays on screen before the next question, in ms. */
const ADVANCE_DELAY = 1200;

const CHOICE_CLASS = [
  'flex min-h-12 w-full items-center gap-3 border-2 border-ink bg-paper px-3 py-2 text-left text-body font-semibold text-ink',
  'shadow-hard-3 enabled:cursor-pointer enabled:hover:bg-mint-mist',
  'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet',
  'data-[state=right]:bg-mint-light data-[state=right]:shadow-pink data-[state=wrong]:bg-pink-light',
].join(' ');

export function initQuiz(root: HTMLElement, quiz: QuizDefinition): void {
  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Quiz "${quiz.id}": missing ${sel}`);
    return el;
  };

  const flags = JSON.parse(root.dataset.flags ?? '{}') as Record<string, string>;
  // The question's picture: the quiz's own images (country shapes) if the page gives them, else the flags.
  const images = root.dataset.images ? (JSON.parse(root.dataset.images) as Record<string, string>) : flags;
  const base = quiz.countries ?? countries;
  const screens = {
    start: $('[data-screen="start"]'),
    play: $('[data-screen="play"]'),
    results: $('[data-screen="results"]'),
  };
  const settingsForm = $<HTMLFormElement>('[data-settings]');
  const summaryEls = root.querySelectorAll<HTMLElement>('[data-summary]');
  const introEl = $('[data-intro]');
  const bestEl = $('[data-best]');
  const roundEl = $('[data-round]');
  const totalEl = $('[data-total]');
  const scoreEl = $('[data-score]');
  const pictureImg = $<HTMLImageElement>('[data-picture]');
  const questionEl = $('[data-question]');
  const announceEl = $('[data-announce]');
  const input = $<HTMLInputElement>('[data-guess]');
  const typeNav = $('[data-type-nav]');
  const prevBtn = $<HTMLButtonElement>('[data-prev]');
  const nextBtn = $<HTMLButtonElement>('[data-next]');
  const choicesEl = $('[data-choices]');
  const continueBtn = $<HTMLButtonElement>('[data-continue]');
  const giveUpBtn = $<HTMLButtonElement>('[data-give-up]');
  const feedback = $('[data-feedback]');
  const resultTitle = $('[data-result-title]');
  const resultBest = $('[data-result-best]');
  const missedWrap = $('[data-missed-wrap]');
  const missedList = $<HTMLUListElement>('[data-missed]');

  let settings: Settings = loadSettings(quiz.id, quiz.modes);
  let round: Country[] = [];
  /** Indexes into `round` answered correctly. */
  let solved = new Set<number>();
  /** Choice mode: indexes answered (right or wrong), and the wrong option picked for each miss. */
  let answered = new Set<number>();
  let picks = new Map<number, string>();
  let current = 0;
  let advanceTimer: number | undefined;

  const show = (name: keyof typeof screens): void => {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  };

  const preload = (country: Country | undefined): void => {
    if (country) new Image().src = images[country.code] ?? '';
  };

  const listFormat = new Intl.ListFormat('en-GB', { type: 'conjunction' });

  // Settings form <-> settings object
  function applySettings(): void {
    setChecked(settingsForm, 'length', [String(settings.length)]);
    setChecked(settingsForm, 'continent', settings.continents);
    setChecked(settingsForm, 'mode', [settings.mode]);
  }

  function readSettingsForm(): Settings {
    const defaults = defaultSettings(quiz.modes);
    const [length] = checkedValues(settingsForm, 'length');
    const [mode] = checkedValues(settingsForm, 'mode');
    const picked = checkedValues(settingsForm, 'continent');
    return {
      length: LENGTHS.find((option) => String(option) === length) ?? defaults.length,
      continents: continents.filter((c) => picked.includes(c)),
      mode: quiz.modes.find((option) => option === mode) ?? defaults.mode,
    };
  }

  /** Shows the controls and intro for the current mode. */
  function applyMode(): void {
    const mode: Mode = settings.mode;
    input.hidden = mode !== 'type';
    typeNav.hidden = mode !== 'type';
    choicesEl.hidden = mode !== 'choice';
    introEl.textContent = quiz.intro[mode] ?? '';
  }

  /** The summary tags: ["10 flags", "All continents"], ["All 46 flags", "Europe", "Typing"]. */
  function describe(): string[] {
    const total = totalFor(settings, base);
    const everywhere = settings.continents.length === continents.length;
    return [
      total === poolFor(settings, base).length ? `All ${total} ${quiz.unit}` : `${total} ${quiz.unit}`,
      everywhere ? 'All continents' : listFormat.format(settings.continents),
      ...(quiz.modes.length > 1 ? [MODE_LABELS[settings.mode]] : []),
    ];
  }

  function updateSummary(): void {
    const none = settings.continents.length === 0;
    summaryEls.forEach((el) => renderSummary(el, none ? 'Pick at least one continent.' : describe()));
    if (none) {
      renderBest(bestEl, null);
      return;
    }
    const best = readBest(quiz.id, settings, base);
    const total = totalFor(settings, base);
    renderBest(
      bestEl,
      best === null
        ? null
        : { shown: `Best ${best} / ${total}`, spoken: `Your best with these settings: ${best} out of ${total}` },
    );
  }

  // Game
  function start(): void {
    window.clearTimeout(advanceTimer);
    round = shuffle(poolFor(settings, base)).slice(0, totalFor(settings, base));
    solved = new Set();
    answered = new Set();
    picks = new Map();
    totalEl.textContent = String(round.length);
    scoreEl.textContent = '0';
    show('play');
    showQuestion(0);
  }

  function showQuestion(index: number): void {
    window.clearTimeout(advanceTimer);
    current = index;
    const country = round[index];
    roundEl.textContent = String(index + 1);
    pictureImg.src = images[country.code] ?? '';
    pictureImg.alt = quiz.imageAlt(country);
    questionEl.textContent = quiz.question(country);
    setFeedback('');
    // Type mode keeps focus in the text box, so nothing else tells a screen reader the question changed.
    // In choice mode, focus moves to the new options, which are labelled by the question.
    announceEl.textContent =
      settings.mode === 'type'
        ? `${quiz.progressLabel} ${index + 1} of ${round.length}. ${quiz.question(country)}`
        : '';

    if (settings.mode === 'type') {
      input.value = '';
      input.readOnly = false;
      const upcoming = findUnsolved(1);
      preload(upcoming === null ? undefined : round[upcoming]);
      // With one question left there's nowhere to move to.
      prevBtn.disabled = upcoming === null;
      nextBtn.disabled = upcoming === null;
      input.focus();
    } else {
      continueBtn.hidden = true;
      renderChoices(country);
      preload(round[index + 1]);
      // Focus the group rather than the first option: a script-moved focus would show the option's ring.
      choicesEl.focus();
    }
  }

  function setFeedback(message: string, tone?: 'right' | 'wrong'): void {
    feedback.textContent = message;
    feedback.classList.toggle('text-accent', tone === 'right');
    feedback.classList.toggle('text-wrong', tone === 'wrong');
  }

  /** Marks the current question right and moves on after a moment to read the message. */
  function markRight(): void {
    solved.add(current);
    scoreEl.textContent = String(solved.size);
    setFeedback(`✓ Correct! It's ${quiz.answer(round[current])}.`, 'right');
    advanceTimer = window.setTimeout(advance, ADVANCE_DELAY);
  }

  function advance(): void {
    if (settings.mode === 'type') {
      if (solved.size === round.length) finish();
      else move(1);
    } else if (current + 1 < round.length) {
      showQuestion(current + 1);
    } else {
      finish();
    }
  }

  // Type mode
  /** The nearest question not yet answered, stepping forwards (1) or backwards (-1) and wrapping round. */
  function findUnsolved(direction: 1 | -1): number | null {
    for (let step = 1; step < round.length; step++) {
      const index = (current + direction * step + round.length) % round.length;
      if (!solved.has(index)) return index;
    }
    return null;
  }

  function move(direction: 1 | -1): void {
    const index = findUnsolved(direction);
    if (index !== null) showQuestion(index);
  }

  // Choice mode
  function renderChoices(country: Country): void {
    const options = quiz.options?.(country) ?? [];
    choicesEl.replaceChildren(
      ...options.map((option, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = CHOICE_CLASS;
        button.dataset.option = option;
        const key = document.createElement('span');
        key.className =
          'grid size-6 shrink-0 place-items-center border-2 border-ink bg-paper font-terminal text-label-sm';
        key.setAttribute('aria-hidden', 'true');
        key.textContent = String(i + 1);
        const text = document.createElement('span');
        text.className = 'grow';
        text.textContent = option;
        // The visible ✓ or ✗, plus words for screen readers, filled in once the player has picked.
        const mark = document.createElement('span');
        mark.dataset.mark = '';
        mark.setAttribute('aria-hidden', 'true');
        const state = document.createElement('span');
        state.dataset.stateText = '';
        state.className = 'sr-only';
        button.append(key, text, mark, state);
        button.addEventListener('click', () => choose(option));
        return button;
      }),
    );
  }

  function choose(option: string): void {
    if (answered.has(current)) return;
    answered.add(current);
    const answer = quiz.answer(round[current]);
    const buttons = Array.from(choicesEl.querySelectorAll<HTMLButtonElement>('button'));
    for (const button of buttons) {
      button.disabled = true;
      const mark = button.querySelector<HTMLElement>('[data-mark]');
      const state = button.querySelector<HTMLElement>('[data-state-text]');
      if (button.dataset.option === answer) {
        button.dataset.state = 'right';
        if (mark) mark.textContent = '✓';
        if (state) state.textContent = option === answer ? ', your answer, correct' : ', correct answer';
      } else if (button.dataset.option === option) {
        button.dataset.state = 'wrong';
        if (mark) mark.textContent = '✗';
        if (state) state.textContent = ', your answer, wrong';
      }
    }

    if (option === answer) return markRight();

    // A wrong tap waits for the player, so there's time to take in the right answer.
    picks.set(current, option);
    setFeedback(`✗ Not quite. It's ${answer}.`, 'wrong');
    continueBtn.textContent = current + 1 < round.length ? 'Next question' : 'See results';
    continueBtn.hidden = false;
    continueBtn.focus();
  }

  // Giving up and results
  function finish(): void {
    window.clearTimeout(advanceTimer);
    const total = round.length;
    const score = solved.size;
    const previous = readBest(quiz.id, settings, base);
    const isBest = score > 0 && (previous === null || score > previous);
    if (isBest) saveBest(quiz.id, settings, score, base);

    resultTitle.textContent = score === total ? `You got all ${total}!` : `You got ${score} out of ${total}`;
    renderBest(
      resultBest,
      isBest
        ? { shown: 'New best!', spoken: 'New best score!' }
        : previous
          ? { shown: `Best ${previous} / ${total}`, spoken: `Your best: ${previous} out of ${total}` }
          : null,
    );

    const missed = round.map((country, index) => ({ country, index })).filter(({ index }) => !solved.has(index));
    missedWrap.hidden = missed.length === 0;
    missedList.replaceChildren(
      ...missed.map(({ country, index }) => {
        const entry = quiz.missed(country, picks.get(index));
        const li = document.createElement('li');
        li.className = 'flex items-center gap-3';
        // The question's own picture: the flag in Flags and Capitals, the outline in Shapes.
        const img = document.createElement('img');
        img.src = images[country.code] ?? '';
        img.alt = '';
        img.width = 48;
        img.height = 36;
        img.className = 'aspect-4/3 w-12 shrink-0 border-2 border-ink bg-paper object-cover';
        const text = document.createElement('span');
        text.className = 'flex flex-col';
        const title = document.createElement('span');
        title.className = 'font-semibold';
        title.textContent = entry.title;
        text.append(title);
        for (const line of entry.lines) {
          const detail = document.createElement('span');
          detail.className = 'text-body-sm text-ink-soft';
          detail.textContent = line;
          text.append(detail);
        }
        li.append(img, text);
        return li;
      }),
    );

    show('results');
    resultTitle.focus();
    updateSummary();
  }

  // Settings dialog. Changes apply as you make them. Only valid settings (at least one continent) are saved.
  const dialog = wireSettingsDialog(root, {
    onChange() {
      settings = readSettingsForm();
      if (settings.continents.length) saveSettings(quiz.id, settings);
      applyMode();
      updateSummary();
    },
    onRevert() {
      settings = loadSettings(quiz.id, quiz.modes);
      applySettings();
      applyMode();
      updateSummary();
    },
  });

  // Play controls
  // Type mode: a right answer is accepted the moment it's typed, so there's nothing to submit.
  // Read-only rather than disabled while moving on keeps focus in the box, so the phone keyboard stays open.
  input.addEventListener('input', () => {
    const country = round[current];
    if (settings.mode === 'type' && country && !input.readOnly && quiz.isCorrect?.(input.value, country)) {
      input.readOnly = true;
      markRight();
    }
  });
  prevBtn.addEventListener('click', () => move(-1));
  nextBtn.addEventListener('click', () => move(1));
  // Choice mode: number keys 1 to 4 pick an option, but only while focus is on the options. Page-wide
  // single-key shortcuts would fail WCAG 2.1.4 (speech input can trigger them by accident).
  choicesEl.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const index = Number(event.key) - 1;
    const button = choicesEl.querySelectorAll<HTMLButtonElement>('button')[index];
    if (Number.isInteger(index) && button && !button.disabled) {
      event.preventDefault();
      button.click();
    }
  });
  continueBtn.addEventListener('click', advance);
  giveUpBtn.addEventListener('click', finish);
  $('[data-start]').addEventListener('click', start);
  $('[data-again]').addEventListener('click', start);

  applySettings();
  dialog.refresh();
  applyMode();
  updateSummary();
}
