// The games listed on the games page. Add, remove or reorder entries here.
import type { HubCard } from './cards';

export const games: HubCard[] = [
  {
    file: 'charades.exe',
    name: 'Charades',
    summary: 'Act it out, no talking. Teams, a timer and a scoreboard, with prompts from films to famous faces.',
    icon: 'gamepad',
    previewColours: ['#ffc6e6', '#9ff3ec'],
    shadow: 'pink',
    href: '/games/charades',
  },
  {
    file: 'higher_lower.exe',
    name: 'Higher or lower',
    summary: 'Is the next country higher or lower? Population, GDP, area or highest point. Keep the streak going.',
    icon: 'updown',
    previewColours: ['#d9c8ff', '#9ff3ec'],
    shadow: 'lilac',
    href: '/games/higher-lower',
  },
];
