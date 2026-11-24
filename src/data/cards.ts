// A card on a hub page (Quizzes, Games). See src/components/HubCard.astro.
import type { IconName } from '../components/Icon.astro';

export interface HubCard {
  /** Shown in the card's title bar, e.g. "flags.exe". */
  file: string;
  name: string;
  summary: string;
  icon: IconName;
  /** Background behind the icon: [from, to] colours of a 135° gradient. */
  previewColours: [string, string];
  /** Colour of the card's offset shadow. */
  shadow: 'mint' | 'pink' | 'lilac';
  /** Leave out for something that isn't ready yet: the card shows "Coming soon" instead of a link. */
  href?: string;
}
