// The quizzes listed on the quizzes page. Add, remove or reorder entries here.
import type { IconName } from '../components/Icon.astro';

export interface Quiz {
  /** Shown in the card's title bar, e.g. "flags.exe". */
  file: string;
  name: string;
  summary: string;
  icon: IconName;
  /** Background behind the icon: [from, to] colours of a 135° gradient. */
  previewColours: [string, string];
  /** Colour of the card's offset shadow. */
  shadow: 'mint' | 'pink' | 'lilac';
  /** Leave out for a quiz that isn't ready yet: the card shows "Coming soon" instead of a link. */
  href?: string;
}

export const quizzes: Quiz[] = [
  {
    file: 'flags.exe',
    name: 'Flags',
    summary: 'Name the country from its flag. Pick how many flags and which continents.',
    icon: 'flag',
    previewColours: ['#ffc6e6', '#c3a6ff'],
    shadow: 'mint',
    href: '/quizzes/flags',
  },
  {
    file: 'capitals.exe',
    name: 'Capitals',
    summary: 'Pick the capital of each country from four of its cities.',
    icon: 'pin',
    previewColours: ['#c9f5f1', '#ffc6e6'],
    shadow: 'pink',
    href: '/quizzes/capitals',
  },
];
