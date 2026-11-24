// The quizzes listed on the quizzes page. Add, remove or reorder entries here.
import type { HubCard } from './cards';

export const quizzes: HubCard[] = [
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
  {
    file: 'shapes.exe',
    name: 'Shapes',
    summary: 'Name the country from its outline. Type it or pick from four.',
    icon: 'shape',
    previewColours: ['#ffe0ef', '#c9f5f1'],
    shadow: 'mint',
    href: '/quizzes/shapes',
  },
];
