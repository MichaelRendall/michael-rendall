// Client side of src/components/settings/PlayerNamesField.astro: shows as many name rows as there are
// players, adds and removes players, and reports changes as they're typed.

export interface PlayerList {
  /** The current names, one per player (blank for unnamed). */
  names(): string[];
  /** Shows these players, e.g. from saved settings. */
  set(names: readonly string[]): void;
}

export function wirePlayerList(
  form: HTMLFormElement,
  limits: { min: number; max: number },
  onChange: () => void,
): PlayerList {
  const rows = Array.from(form.querySelectorAll<HTMLElement>('[data-player-row]'));
  const inputs = rows.map((row) => row.querySelector('input') as HTMLInputElement);
  const addBtn = form.querySelector<HTMLButtonElement>('[data-add-player]');
  let count = rows.filter((row) => !row.hidden).length;

  const names = (): string[] => inputs.slice(0, count).map((input) => input.value);

  function set(list: readonly string[]): void {
    count = Math.min(limits.max, Math.max(limits.min, list.length));
    rows.forEach((row, i) => {
      row.hidden = i >= count;
      inputs[i].value = i < count ? (list[i] ?? '') : '';
      const remove = row.querySelector<HTMLButtonElement>('[data-remove-player]');
      if (remove) remove.disabled = count <= limits.min;
    });
    if (addBtn) addBtn.disabled = count >= limits.max;
  }

  addBtn?.addEventListener('click', () => {
    if (count >= limits.max) return;
    set([...names(), '']);
    onChange();
    inputs[count - 1]?.focus();
  });
  rows.forEach((row, i) =>
    row.querySelector('[data-remove-player]')?.addEventListener('click', () => {
      if (count <= limits.min) return;
      // Names below move up a row, so removing Player 2 keeps everyone else's name.
      const next = names();
      next.splice(i, 1);
      set(next);
      onChange();
      (inputs[Math.min(i, count - 1)] ?? addBtn)?.focus();
    }),
  );
  // Names save as they're typed, so pressing Enter or Done never loses the last one.
  inputs.forEach((input) => input.addEventListener('input', onChange));

  return { names, set };
}
