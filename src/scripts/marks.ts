// The tick and cross used everywhere a right or wrong mark appears: bold strokes with rounded ends, plus a
// light offset shadow like the site's hard shadows. Teal on mint for a tick, raspberry on pink for a cross.
// createMark() builds one in the browser; src/components/Mark.astro draws the same at build time.

export type MarkKind = 'tick' | 'cross';

/** Drawn on a 24 x 24 grid. The shadow is the same stroke, 2 units down and to the right. */
export const MARKS: Record<MarkKind, { d: string; fill: string; shadow: string }> = {
  tick: { d: 'M4.5 12.5l5 5L19.5 6', fill: 'var(--color-accent)', shadow: 'var(--color-mint)' },
  cross: { d: 'M6 6l12 12M18 6L6 18', fill: 'var(--color-wrong)', shadow: 'var(--color-pink-light)' },
};

export const MARK_STROKE = 3.5;
export const MARK_SHADOW_OFFSET = 2;

/**
 * Classes that size a mark to the text around it. Marks also need an inline display (Tailwind's base styles
 * make every SVG a block, which would put the mark on a line of its own): createMark adds inline-block, and
 * Mark.astro does unless it's given its own display classes.
 */
export const MARK_CLASS = 'size-[1.1em] shrink-0';

/** A decorative mark (hidden from screen readers; the text around it says right or wrong). */
export function createMark(kind: MarkKind): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `${MARK_CLASS} inline-block`);
  const { d, fill, shadow } = MARKS[kind];
  for (const [colour, offset] of [
    [shadow, MARK_SHADOW_OFFSET],
    [fill, 0],
  ] as const) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colour);
    path.setAttribute('stroke-width', String(MARK_STROKE));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    if (offset) path.setAttribute('transform', `translate(${offset} ${offset})`);
    svg.append(path);
  }
  return svg;
}

/**
 * A mark before a message, e.g. a tick before "Correct! It's Peru." The two sit in one inline flex row,
 * centred on each other, so the mark lines up with the text whatever the font.
 */
export function withMark(kind: MarkKind, message: string): HTMLSpanElement {
  const row = document.createElement('span');
  row.className = 'inline-flex items-center gap-[0.4em]';
  const text = document.createElement('span');
  text.textContent = message;
  row.append(createMark(kind), text);
  return row;
}
