// Charades: teams take turns. The actor sees a prompt and acts it out without speaking; their team
// guesses. "Got it" scores a point, "Skip" moves on. Markup: src/pages/games/charades.astro.
//
// Screens: start → turn (pass to the actor) → act (prompt and timer) → buzzer (did they get the last one?)
// → summary (this round's prompts) → the next team's turn, until every team has had its rounds → final.
import { CATEGORIES, CATEGORY_LABELS, prompts, type Category } from '../../data/charades-prompts';
import { checkedValues, renderSummary, setChecked, wireSettingsDialog } from '../settings-dialog';
import {
  DEFAULT_SETTINGS,
  LEVEL_OPTIONS,
  TEAM_NAME_MAX,
  ROUND_OPTIONS,
  SECONDS_OPTIONS,
  TEAM_OPTIONS,
  describe,
  levelsFor,
  loadSettings,
  possessive,
  saveSettings,
  teamName,
  type Settings,
} from './settings';

interface Prompt {
  text: string;
  category: Category;
}

interface RoundLog {
  got: string[];
  skipped: string[];
}

const shuffle = <T>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const clock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function initCharades(root: HTMLElement): void {
  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Charades: missing ${sel}`);
    return el;
  };

  const screens = {
    start: $('[data-screen="start"]'),
    turn: $('[data-screen="turn"]'),
    act: $('[data-screen="act"]'),
    buzzer: $('[data-screen="buzzer"]'),
    summary: $('[data-screen="summary"]'),
    final: $('[data-screen="final"]'),
  };
  const settingsForm = $<HTMLFormElement>('[data-settings]');
  const summaryEls = root.querySelectorAll<HTMLElement>('[data-summary]');
  const turnTitle = $('[data-turn-title]');
  const turnRound = $('[data-turn-round]');
  const scoreboards = root.querySelectorAll<HTMLOListElement>('[data-scoreboard]');
  const actTeam = $('[data-act-team]');
  const timerEl = $('[data-timer]');
  const timerBar = $('[data-timer-bar]');
  const timerTrack = $('[data-timer-track]');
  const announceEl = $('[data-announce]');
  const categoryEl = $('[data-category]');
  const promptEl = $('[data-prompt]');
  const gotBtn = $<HTMLButtonElement>('[data-got]');
  const skipBtn = $<HTMLButtonElement>('[data-skip]');
  const roundScoreEl = $('[data-round-score]');
  const lastPromptEl = $('[data-last-prompt]');
  const summaryTitle = $('[data-summary-title]');
  const gotList = $<HTMLUListElement>('[data-got-list]');
  const skippedList = $<HTMLUListElement>('[data-skipped-list]');
  const skippedWrap = $('[data-skipped-wrap]');
  const nextBtn = $<HTMLButtonElement>('[data-next-turn]');
  const finalTitle = $('[data-final-title]');
  const teamNameInputs = settingsForm.querySelectorAll<HTMLInputElement>('input[name="team-name"]');

  let settings = loadSettings();
  let scores: number[] = [];
  let turn = 0;
  let deck: Prompt[] = [];
  let current: Prompt | undefined;
  let log: RoundLog = { got: [], skipped: [] };
  let endsAt = 0;
  let ticker: number | undefined;
  let warned = false;
  let lastTick = -1;
  let wakeLock: { release(): Promise<void> } | null = null;
  let audio: AudioContext | null = null;

  const teamOf = (t: number): number => t % settings.teams;
  const roundOf = (t: number): number => Math.floor(t / settings.teams) + 1;
  const totalTurns = (): number => settings.teams * settings.rounds;

  function show(name: keyof typeof screens, focus?: HTMLElement): void {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
    focus?.focus();
  }

  // Settings
  function applySettings(): void {
    setChecked(settingsForm, 'category', settings.categories);
    setChecked(settingsForm, 'level', [settings.level]);
    setChecked(settingsForm, 'seconds', [String(settings.seconds)]);
    setChecked(settingsForm, 'teams', [String(settings.teams)]);
    setChecked(settingsForm, 'rounds', [String(settings.rounds)]);
    setChecked(settingsForm, 'sound', [settings.sound ? 'on' : 'off']);
    teamNameInputs.forEach((input, i) => (input.value = settings.teamNames[i] ?? ''));
    showTeamNameFields();
  }

  function readSettingsForm(): Settings {
    const one = (name: string): string | undefined => checkedValues(settingsForm, name)[0];
    const picked = checkedValues(settingsForm, 'category');
    return {
      categories: CATEGORIES.filter((c) => picked.includes(c)),
      level: LEVEL_OPTIONS.find((o) => o === one('level')) ?? DEFAULT_SETTINGS.level,
      seconds: SECONDS_OPTIONS.find((o) => String(o) === one('seconds')) ?? DEFAULT_SETTINGS.seconds,
      teams: TEAM_OPTIONS.find((o) => String(o) === one('teams')) ?? DEFAULT_SETTINGS.teams,
      rounds: ROUND_OPTIONS.find((o) => String(o) === one('rounds')) ?? DEFAULT_SETTINGS.rounds,
      sound: one('sound') !== 'off',
      teamNames: Array.from(teamNameInputs, (input) => input.value.slice(0, TEAM_NAME_MAX)),
    };
  }

  /** Shows a name box for each team in play, so choosing 3 teams shows 3 boxes. */
  function showTeamNameFields(): void {
    teamNameInputs.forEach((input, i) => {
      const field = input.closest<HTMLElement>('[data-team-field]');
      if (field) field.hidden = i >= settings.teams;
    });
  }

  function updateSummary(): void {
    const none = settings.categories.length === 0;
    summaryEls.forEach((el) => renderSummary(el, none ? 'Pick at least one category.' : describe(settings)));
  }

  // Prompts: a shuffled deck of everything the settings allow, refilled once it runs out.
  function draw(): Prompt {
    if (!deck.length) {
      const levels = levelsFor(settings.level);
      deck = shuffle(
        settings.categories.flatMap((category) =>
          levels.flatMap((level) => prompts[category][level].map((text) => ({ text, category }))),
        ),
      );
      // Don't open a fresh deck with the prompt just shown.
      if (deck.length > 1 && deck[0].text === current?.text) deck.push(deck.shift() as Prompt);
    }
    return deck.shift() as Prompt;
  }

  // Scores
  function renderScoreboards(): void {
    const best = Math.max(...scores);
    scoreboards.forEach((list) =>
      list.replaceChildren(
        ...scores.map((score, team) => {
          const li = document.createElement('li');
          li.className = 'flex justify-between gap-6 bg-blush px-3 py-1';
          const name = document.createElement('span');
          name.textContent = teamName(settings, team);
          const points = document.createElement('span');
          points.className = 'tabular-nums';
          points.textContent = `${score} ${score === 1 ? 'point' : 'points'}`;
          if (score === best && best > 0) li.classList.add('font-semibold');
          li.append(name, points);
          return li;
        }),
      ),
    );
  }

  // Sound and vibration: only after a tap (browsers require it), and only if sound is on.
  function beep(frequency: number, duration: number): void {
    if (!settings.sound || !audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  // Keep the screen on while acting, where the browser supports it.
  async function keepAwake(): Promise<void> {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> };
      };
      wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null;
    }
  }
  function letSleep(): void {
    void wakeLock?.release().catch(() => undefined);
    wakeLock = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !screens.act.hidden) void keepAwake();
  });

  // Game flow
  function startGame(): void {
    scores = Array.from({ length: settings.teams }, () => 0);
    turn = 0;
    deck = [];
    current = undefined;
    showTurn();
  }

  function showTurn(): void {
    turnTitle.textContent = `${possessive(teamName(settings, teamOf(turn)))} turn`;
    turnRound.textContent = `Round ${roundOf(turn)} of ${settings.rounds}`;
    renderScoreboards();
    show('turn', turnTitle);
  }

  function startRound(): void {
    // Created on a tap so the browser allows sound.
    if (settings.sound && !audio) {
      const Context =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      audio = Context ? new Context() : null;
    }
    void audio?.resume();
    log = { got: [], skipped: [] };
    actTeam.textContent = `${teamName(settings, teamOf(turn))} · Round ${roundOf(turn)}`;
    nextPrompt();
    const timed = settings.seconds > 0;
    timerEl.hidden = !timed;
    timerTrack.hidden = !timed;
    warned = false;
    lastTick = -1;
    if (timed) {
      endsAt = performance.now() + settings.seconds * 1000;
      tick();
      ticker = window.setInterval(tick, 200);
    }
    void keepAwake();
    show('act', promptEl);
  }

  function tick(): void {
    const left = Math.max(0, (endsAt - performance.now()) / 1000);
    const whole = Math.ceil(left);
    timerEl.textContent = clock(whole);
    timerBar.style.width = `${(left / settings.seconds) * 100}%`;
    timerBar.classList.toggle('bg-pink', whole <= 10);
    timerBar.classList.toggle('bg-teal', whole > 10);
    // Screen readers hear the warning and the end, not every second.
    if (whole <= 10 && !warned) {
      warned = true;
      announceEl.textContent = '10 seconds left';
    }
    if (whole <= 3 && whole > 0 && whole !== lastTick) {
      lastTick = whole;
      beep(660, 0.08);
    }
    if (left <= 0) timeUp();
  }

  function stopTimer(): void {
    window.clearInterval(ticker);
    ticker = undefined;
  }

  function nextPrompt(): void {
    current = draw();
    categoryEl.textContent = CATEGORY_LABELS[current.category];
    promptEl.textContent = current.text;
  }

  function got(): void {
    if (!current) return;
    log.got.push(current.text);
    scores[teamOf(turn)]++;
    nextPrompt();
  }

  function skip(): void {
    if (!current) return;
    log.skipped.push(current.text);
    nextPrompt();
  }

  /** Time's up: guesses often land on the buzzer, so ask about the last prompt before scoring it. */
  function timeUp(): void {
    stopTimer();
    letSleep();
    announceEl.textContent = "Time's up";
    beep(220, 0.6);
    navigator.vibrate?.([200, 100, 200]);
    roundScoreEl.textContent = String(log.got.length);
    lastPromptEl.textContent = current?.text ?? '';
    show('buzzer', $('[data-buzzer-title]'));
  }

  function lastPrompt(gotIt: boolean): void {
    if (current) (gotIt ? log.got : log.skipped).push(current.text);
    if (gotIt) scores[teamOf(turn)]++;
    current = undefined;
    showSummary();
  }

  /** End round early (or the only way to end it with no timer). The prompt on screen isn't scored. */
  function endRound(): void {
    stopTimer();
    letSleep();
    if (current) log.skipped.push(current.text);
    current = undefined;
    showSummary();
  }

  function showSummary(): void {
    const team = teamName(settings, teamOf(turn));
    const points = log.got.length;
    summaryTitle.textContent = `${team} got ${points} ${points === 1 ? 'point' : 'points'}`;
    const fill = (list: HTMLUListElement, items: string[], mark: string): void =>
      list.replaceChildren(
        ...items.map((text) => {
          const li = document.createElement('li');
          const markEl = document.createElement('span');
          markEl.setAttribute('aria-hidden', 'true');
          markEl.textContent = `${mark} `;
          li.append(markEl, text);
          return li;
        }),
      );
    fill(gotList, log.got, '✓');
    gotList.hidden = !log.got.length;
    fill(skippedList, log.skipped, '✗');
    skippedWrap.hidden = !log.skipped.length;
    renderScoreboards();
    const last = turn + 1 >= totalTurns();
    nextBtn.textContent = last ? 'See final scores' : `Next: ${teamName(settings, teamOf(turn + 1))}`;
    show('summary', summaryTitle);
  }

  function nextTurn(): void {
    turn++;
    if (turn >= totalTurns()) return showFinal();
    showTurn();
  }

  function showFinal(): void {
    const best = Math.max(...scores);
    const winners = scores.flatMap((score, team) => (score === best ? [teamName(settings, team)] : []));
    finalTitle.textContent =
      winners.length === 1
        ? `${winners[0]} wins!`
        : winners.length === scores.length
          ? "It's a draw!"
          : `${new Intl.ListFormat('en-US', { type: 'conjunction' }).format(winners)} tie!`;
    renderScoreboards();
    show('final', finalTitle);
  }

  /** End the whole game early, from the turn screen. */
  function endGame(): void {
    stopTimer();
    letSleep();
    showFinal();
  }

  const dialog = wireSettingsDialog(
    root,
    {
      onChange() {
        settings = readSettingsForm();
        if (settings.categories.length) saveSettings(settings);
        showTeamNameFields();
        updateSummary();
      },
      onRevert() {
        settings = loadSettings();
        applySettings();
        updateSummary();
      },
    },
    'category',
  );

  // Save names as they're typed, so pressing Enter or Done never loses the last one.
  settingsForm.addEventListener('input', (event) => {
    if ((event.target as HTMLElement).matches('input[name="team-name"]')) {
      settings = readSettingsForm();
      if (settings.categories.length) saveSettings(settings);
    }
  });
  $('[data-start]').addEventListener('click', startGame);
  $('[data-ready]').addEventListener('click', startRound);
  gotBtn.addEventListener('click', got);
  skipBtn.addEventListener('click', skip);
  $('[data-end-round]').addEventListener('click', endRound);
  $('[data-last-yes]').addEventListener('click', () => lastPrompt(true));
  $('[data-last-no]').addEventListener('click', () => lastPrompt(false));
  nextBtn.addEventListener('click', nextTurn);
  $('[data-end-game]').addEventListener('click', endGame);
  $('[data-again]').addEventListener('click', startGame);

  applySettings();
  dialog.refresh();
  updateSummary();
}
