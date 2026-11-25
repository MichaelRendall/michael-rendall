// Blend In: everyone but the outsider shares a secret word. Each player gives a one-word clue, the group
// votes on who the outsider is, and a caught outsider gets one guess at the word. Markup:
// src/pages/games/blend-in.astro.
//
// Screens: start → pass (each player sees their card in turn) → clues → vote (optional timer) →
// guess (only if the outsider was caught) → result (scores) → the next round, or final.
//
// Scoring each round:
// - The outsider escapes (wrong person voted out): the outsider scores 2.
// - The outsider is caught but guesses the word: the outsider scores 1.
// - The outsider is caught and doesn't: everyone else scores 1.
import { CATEGORIES, CATEGORY_LABELS, words, type Category } from '../../data/blend-in-words';
import { GameClock, formatClock } from '../quiz/clock';
import { checkedValues, renderSummary, setChecked, wireSettingsDialog } from '../settings-dialog';
import {
  CLUE_ROUND_OPTIONS,
  DEFAULT_SETTINGS,
  DISCUSS_OPTIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MODES,
  PLAYER_NAME_MAX,
  describe,
  loadSettings,
  playerName,
  saveSettings,
  type Settings,
} from './settings';

interface Round {
  word: string;
  cousin: string;
  category: Category;
  outsider: number;
  starter: number;
}

const randomInt = (max: number): number => Math.floor(Math.random() * max);

export function initBlendIn(root: HTMLElement): void {
  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Blend In: missing ${sel}`);
    return el;
  };

  const screens = {
    start: $('[data-screen="start"]'),
    pass: $('[data-screen="pass"]'),
    clues: $('[data-screen="clues"]'),
    vote: $('[data-screen="vote"]'),
    guess: $('[data-screen="guess"]'),
    result: $('[data-screen="result"]'),
    final: $('[data-screen="final"]'),
  };
  const settingsForm = $<HTMLFormElement>('[data-settings]');
  const summaryEls = root.querySelectorAll<HTMLElement>('[data-summary]');
  const playerRows = Array.from(settingsForm.querySelectorAll<HTMLElement>('[data-player-row]'));
  const playerInputs = playerRows.map((row) => row.querySelector('input') as HTMLInputElement);
  const addPlayerBtn = $<HTMLButtonElement>('[data-add-player]');
  const passTitle = $('[data-pass-title]');
  const showCardBtn = $<HTMLButtonElement>('[data-show-card]');
  const card = $('[data-card]');
  const cardHeading = $('[data-card-heading]');
  const cardWord = $('[data-card-word]');
  const cardCategory = $('[data-card-category]');
  const cardNote = $('[data-card-note]');
  const hideCardBtn = $<HTMLButtonElement>('[data-hide-card]');
  const cluesTitle = $('[data-clues-title]');
  const cluesText = $('[data-clues-text]');
  const voteTitle = $('[data-vote-title]');
  const voteList = $('[data-vote-list]');
  const clockWrap = $('[data-clock-wrap]');
  const clockEl = $('[data-clock]');
  const clockBar = $('[data-clock-bar]');
  const announceEl = $('[data-announce]');
  const guessTitle = $('[data-guess-title]');
  const guessText = $('[data-guess-text]');
  const resultTitle = $('[data-result-title]');
  const resultWords = $('[data-result-words]');
  const resultPoints = $('[data-result-points]');
  const finalTitle = $('[data-final-title]');
  const scoreboards = root.querySelectorAll<HTMLOListElement>('[data-scoreboard]');

  let settings = loadSettings();
  let scores: number[] = [];
  let round: Round | undefined;
  let passing = 0;
  /** Recently used words, so the same one doesn't come straight back. */
  let recent: string[] = [];

  const name = (player: number): string => playerName(settings, player);
  const count = (): number => settings.players.length;

  function show(screen: keyof typeof screens, focus?: HTMLElement): void {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== screen;
    focus?.focus();
  }

  // Settings: player list
  function applyPlayers(): void {
    playerRows.forEach((row, i) => {
      row.hidden = i >= count();
      playerInputs[i].value = settings.players[i] ?? '';
      const remove = row.querySelector<HTMLButtonElement>('[data-remove-player]');
      if (remove) remove.disabled = count() <= MIN_PLAYERS;
    });
    addPlayerBtn.disabled = count() >= MAX_PLAYERS;
  }

  function applySettings(): void {
    setChecked(settingsForm, 'category', settings.categories);
    setChecked(settingsForm, 'mode', [settings.mode]);
    setChecked(settingsForm, 'clue-rounds', [String(settings.clueRounds)]);
    setChecked(settingsForm, 'discuss', [String(settings.discussSeconds)]);
    applyPlayers();
  }

  function readSettingsForm(): Settings {
    const one = (field: string): string | undefined => checkedValues(settingsForm, field)[0];
    const picked = checkedValues(settingsForm, 'category');
    return {
      players: playerInputs.slice(0, count()).map((input) => input.value.slice(0, PLAYER_NAME_MAX)),
      categories: CATEGORIES.filter((c) => picked.includes(c)),
      mode: MODES.find((m) => m === one('mode')) ?? DEFAULT_SETTINGS.mode,
      clueRounds: CLUE_ROUND_OPTIONS.find((o) => String(o) === one('clue-rounds')) ?? DEFAULT_SETTINGS.clueRounds,
      discussSeconds: DISCUSS_OPTIONS.find((o) => String(o) === one('discuss')) ?? DEFAULT_SETTINGS.discussSeconds,
    };
  }

  function updateSummary(): void {
    const none = settings.categories.length === 0;
    summaryEls.forEach((el) => renderSummary(el, none ? 'Pick at least one category.' : describe(settings)));
  }

  function settingsChanged(): void {
    settings = readSettingsForm();
    if (settings.categories.length) saveSettings(settings);
    updateSummary();
  }

  // Scores
  function renderScoreboards(): void {
    const best = Math.max(...scores);
    scoreboards.forEach((list) =>
      list.replaceChildren(
        ...scores.map((score, player) => {
          const li = document.createElement('li');
          li.className = 'flex justify-between gap-6 bg-blush px-3 py-1';
          if (score === best && best > 0) li.classList.add('font-semibold');
          const who = document.createElement('span');
          who.textContent = name(player);
          const points = document.createElement('span');
          points.className = 'tabular-nums';
          points.textContent = `${score} ${score === 1 ? 'point' : 'points'}`;
          li.append(who, points);
          return li;
        }),
      ),
    );
  }

  // A round
  function pickWord(): Pick<Round, 'word' | 'cousin' | 'category'> {
    const all = settings.categories.flatMap((category) =>
      words[category].map(([word, cousin]) => ({ word, cousin, category })),
    );
    const fresh = all.filter((w) => !recent.includes(w.word));
    const choice = (fresh.length ? fresh : all)[randomInt(fresh.length ? fresh.length : all.length)];
    recent = [...recent.slice(-30), choice.word];
    // Either word of the pair can be the main one, so both get used.
    return Math.random() < 0.5 ? choice : { ...choice, word: choice.cousin, cousin: choice.word };
  }

  function startGame(): void {
    scores = Array.from({ length: count() }, () => 0);
    startRound();
  }

  function startRound(): void {
    const outsider = randomInt(count());
    // The starter is never the outsider, so the outsider always hears at least one clue first.
    let starter = randomInt(count() - 1);
    if (starter >= outsider) starter++;
    round = { ...pickWord(), outsider, starter };
    passing = 0;
    showPass();
  }

  function showPass(): void {
    passTitle.textContent = `Pass to ${name(passing)}`;
    card.hidden = true;
    showCardBtn.hidden = false;
    hideCardBtn.textContent = passing + 1 < count() ? `Hide and pass to ${name(passing + 1)}` : 'Hide and start';
    show('pass', passTitle);
  }

  function showCard(): void {
    if (!round) return;
    const isOutsider = passing === round.outsider;
    cardCategory.textContent = CATEGORY_LABELS[round.category];
    if (settings.mode === 'classic' && isOutsider) {
      cardHeading.textContent = "You're the outsider!";
      cardWord.textContent = 'Blend in';
      cardNote.textContent = 'Bluff your way through the clues.';
    } else {
      cardHeading.textContent = settings.mode === 'classic' ? 'The secret word is' : 'Your word is';
      cardWord.textContent = settings.mode === 'undercover' && isOutsider ? round.cousin : round.word;
      cardNote.textContent = settings.mode === 'classic' ? '' : 'Someone might have a different word… maybe you.';
    }
    cardNote.hidden = !cardNote.textContent;
    showCardBtn.hidden = true;
    card.hidden = false;
    hideCardBtn.focus();
  }

  function hideCard(): void {
    card.hidden = true;
    passing++;
    if (passing < count()) showPass();
    else showClues();
  }

  function showClues(): void {
    if (!round) return;
    cluesTitle.textContent = 'Clue time';
    const times = settings.clueRounds === 1 ? 'once' : 'twice';
    cluesText.textContent = `${name(round.starter)} starts. Go round the circle ${times}, one word each. Don't make it too easy!`;
    show('clues', cluesTitle);
  }

  // Voting, with an optional discussion countdown
  const clock = new GameClock((elapsedMs) => {
    const limit = settings.discussSeconds;
    const left = Math.max(0, limit - elapsedMs / 1000);
    clockEl.textContent = formatClock(Math.ceil(left));
    clockBar.style.width = `${(left / limit) * 100}%`;
    clockBar.classList.toggle('bg-pink', left <= 10);
    clockBar.classList.toggle('bg-teal', left > 10);
    if (left <= 0) {
      clock.stop();
      announceEl.textContent = 'Time to vote';
      navigator.vibrate?.([200, 100, 200]);
    }
  });

  function showVote(): void {
    voteTitle.textContent = "Who's the outsider?";
    voteList.replaceChildren(
      ...settings.players.map((_, player) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className =
          'min-h-12 border-2 border-ink bg-paper px-3 text-left text-body font-semibold text-ink shadow-hard-3 enabled:cursor-pointer enabled:hover:bg-mint-mist focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet';
        button.textContent = name(player);
        button.addEventListener('click', () => vote(player));
        return button;
      }),
    );
    clockWrap.hidden = settings.discussSeconds === 0;
    announceEl.textContent = '';
    if (settings.discussSeconds) clock.start();
    show('vote', voteTitle);
  }

  function vote(player: number): void {
    if (!round) return;
    clock.stop();
    if (player === round.outsider) {
      guessTitle.textContent = `Caught! ${name(round.outsider)} was the outsider.`;
      guessText.textContent =
        settings.mode === 'classic'
          ? `${name(round.outsider)}, you get one guess at the secret word. Say it out loud.`
          : `${name(round.outsider)}, you had a different word. Guess the word everyone else had.`;
      show('guess', guessTitle);
    } else {
      finishRound('escaped', player);
    }
  }

  function finishRound(outcome: 'escaped' | 'guessed' | 'caught', votedFor?: number): void {
    if (!round) return;
    const outsider = name(round.outsider);
    if (outcome === 'escaped') {
      scores[round.outsider] += 2;
      resultTitle.textContent = `Wrong! ${outsider} was the outsider.`;
      resultPoints.textContent = `${votedFor === undefined ? 'You' : `You voted for ${name(votedFor)}, so`} ${outsider} escapes and scores 2.`;
    } else if (outcome === 'guessed') {
      scores[round.outsider] += 1;
      resultTitle.textContent = `${outsider} guessed it!`;
      resultPoints.textContent = `Caught, but the right guess still scores ${outsider} 1.`;
    } else {
      scores.forEach((_, player) => {
        if (player !== round?.outsider) scores[player] += 1;
      });
      resultTitle.textContent = `Got them! ${outsider} was the outsider.`;
      resultPoints.textContent = `Everyone except ${outsider} scores 1.`;
    }
    resultWords.textContent =
      settings.mode === 'classic'
        ? `The secret word was ${round.word}.`
        : `Everyone else had ${round.word}; ${outsider} had ${round.cousin}.`;
    renderScoreboards();
    show('result', resultTitle);
  }

  function showFinal(): void {
    clock.stop();
    const best = Math.max(...scores);
    const winners = scores.flatMap((score, player) => (score === best ? [name(player)] : []));
    finalTitle.textContent =
      best === 0
        ? 'No points scored'
        : winners.length === 1
          ? `${winners[0]} wins!`
          : `${new Intl.ListFormat('en-US', { type: 'conjunction' }).format(winners)} tie!`;
    renderScoreboards();
    show('final', finalTitle);
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
  // Names save as they're typed, so pressing Enter or Done never loses the last one.
  settingsForm.addEventListener('input', (event) => {
    if ((event.target as HTMLElement).matches('input[name="player"]')) settingsChanged();
  });
  addPlayerBtn.addEventListener('click', () => {
    if (count() >= MAX_PLAYERS) return;
    settings = { ...settings, players: [...settings.players, ''] };
    applyPlayers();
    settingsChanged();
    playerInputs[count() - 1]?.focus();
  });
  playerRows.forEach((row, i) =>
    row.querySelector('[data-remove-player]')?.addEventListener('click', () => {
      if (count() <= MIN_PLAYERS) return;
      // Typed names move up a row, so removing Player 2 keeps everyone else's name.
      const names = playerInputs.slice(0, count()).map((input) => input.value);
      names.splice(i, 1);
      settings = { ...settings, players: names };
      applyPlayers();
      settingsChanged();
      (playerInputs[Math.min(i, count() - 1)] ?? addPlayerBtn).focus();
    }),
  );

  // Play
  $('[data-start]').addEventListener('click', startGame);
  showCardBtn.addEventListener('click', showCard);
  hideCardBtn.addEventListener('click', hideCard);
  $('[data-clues-done]').addEventListener('click', showVote);
  $('[data-guess-yes]').addEventListener('click', () => finishRound('guessed'));
  $('[data-guess-no]').addEventListener('click', () => finishRound('caught'));
  $('[data-next-round]').addEventListener('click', startRound);
  $('[data-end-game]').addEventListener('click', showFinal);
  $('[data-again]').addEventListener('click', startGame);

  applySettings();
  dialog.refresh();
  updateSummary();
}
