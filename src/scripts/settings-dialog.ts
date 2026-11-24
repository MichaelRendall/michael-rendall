// Client side of the shared settings pop-up (src/components/settings/). Opens and closes it, runs
// Select all and Clear, and enforces "at least one" in the required group (continents, or Charades'
// categories). Each game supplies what a change means.

/** One summary tag. Shared with SummaryTags.astro, which draws the first version at build time. */
export const SUMMARY_TAG_CLASS = 'bg-lilac-mist px-2 py-0.5 font-terminal text-label tracking-label text-ink';

/**
 * Redraws a summary (src/components/settings/SummaryTags.astro) as tags, one per setting, with hidden
 * commas so screen readers hear a list. A plain string, such as a warning, is shown as text.
 */
export function renderSummary(el: HTMLElement, parts: string[] | string): void {
  if (typeof parts === 'string') {
    el.textContent = parts;
    return;
  }
  el.replaceChildren(
    ...parts.flatMap((part, i) => {
      const tag = document.createElement('span');
      tag.className = SUMMARY_TAG_CLASS;
      tag.textContent = part;
      if (i === 0) return [tag];
      const comma = document.createElement('span');
      comma.className = 'sr-only';
      comma.textContent = ', ';
      return [comma, tag];
    }),
  );
}

/** The best-score tag: like a summary tag, in mint, so it reads as your score rather than a setting. */
export const BEST_TAG_CLASS = 'self-start bg-mint-mist px-2 py-0.5 font-terminal text-label tracking-label text-ink';

/**
 * Shows a best score as a short tag ("Best 5 / 46") while screen readers hear the full sentence
 * ("Your best with these settings: 5 out of 46"). Hidden when there's no best yet.
 */
export function renderBest(el: HTMLElement, best: { shown: string; spoken: string } | null): void {
  el.hidden = best === null;
  if (!best) {
    el.replaceChildren();
    return;
  }
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  shown.textContent = best.shown;
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = best.spoken;
  el.replaceChildren(shown, spoken);
}

export const checkedValues = (form: HTMLFormElement, name: string): string[] =>
  Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`))
    .filter((el) => el.checked)
    .map((el) => el.value);

export function setChecked(form: HTMLFormElement, name: string, values: readonly string[]): void {
  form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((el) => {
    el.checked = values.includes(el.value);
  });
}

interface Hooks {
  /** The form changed: read it, save it if valid, update the page. */
  onChange(): void;
  /** Closed with nothing picked in the required group: put the last saved settings back in the form. */
  onRevert(): void;
}

/** Wires up the pop-up inside `root`. Returns `refresh`, to call after setting the form from code. */
export function wireSettingsDialog(
  root: HTMLElement,
  hooks: Hooks,
  /** The checkbox group that needs at least one pick, and has Select all and Clear. */
  required = 'continent',
): { refresh(): void } {
  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Settings: missing ${sel}`);
    return el;
  };
  const dialog = $<HTMLDialogElement>('[data-settings-dialog]');
  const form = $<HTMLFormElement>('[data-settings]');
  const selectAllBtn = $<HTMLButtonElement>('[data-select-all]');
  const clearBtn = $<HTMLButtonElement>('[data-clear]');
  const requiredInputs = form.querySelectorAll<HTMLInputElement>(`input[name="${required}"]`);
  const picked = (): number => Array.from(requiredInputs).filter((el) => el.checked).length;

  function refresh(): void {
    selectAllBtn.disabled = picked() === requiredInputs.length;
    clearBtn.disabled = picked() === 0;
  }

  function changed(): void {
    hooks.onChange();
    refresh();
  }

  // The tapped button disables itself (nothing left to select or clear), which would drop focus, so focus
  // moves to the other one. A button, not an option, so no focus ring appears after a tap.
  const setAll = (checked: boolean): void => {
    requiredInputs.forEach((el) => (el.checked = checked));
    changed();
    (checked ? clearBtn : selectAllBtn).focus();
  };

  root.querySelectorAll('[data-open-settings]').forEach((el) =>
    el.addEventListener('click', () => {
      dialog.showModal();
      // Focus the pop-up itself, not its first option: screen readers announce it, Tab reaches the
      // options, and no focus ring shows until the player uses the keyboard.
      dialog.focus();
    }),
  );
  form.addEventListener('change', changed);
  selectAllBtn.addEventListener('click', () => setAll(true));
  clearBtn.addEventListener('click', () => setAll(false));
  // "Done" needs something picked. Closing any other way (Escape, the × button) goes back to the last saved settings.
  form.addEventListener('submit', (event) => {
    if (picked()) return;
    event.preventDefault();
    requiredInputs[0]?.focus();
  });
  $('[data-settings-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (picked()) return;
    hooks.onRevert();
    refresh();
  });

  refresh();
  return { refresh };
}
