// A card on a hub page (Quizzes, Games). See src/components/HubCard.astro.
import type { IconName } from '../components/Icon.astro';

/** Offset-shadow colours. Each game's hub card and page window share one, so the colour carries through. */
export type ShadowColour = 'mint' | 'pink' | 'lilac' | 'teal';

/** The class that recolours a shadow-hard-* shadow. Mint is the default, so it needs none. */
export const SHADOW_CLASS: Record<ShadowColour, string> = {
  mint: '',
  pink: 'shadow-pink',
  lilac: 'shadow-lilac',
  teal: 'shadow-teal',
};

export interface HubCard {
  /** Shown in the card's title bar, e.g. "flags.exe". */
  file: string;
  name: string;
  summary: string;
  icon: IconName;
  /** Background behind the icon: [from, to] colours of a 135° gradient. */
  previewColours: [string, string];
  /** Colour of the card's offset shadow; the page's window uses the same one. */
  shadow: ShadowColour;
  /** Leave out for something that isn't ready yet: the card shows "Coming soon" instead of a link. */
  href?: string;
}
