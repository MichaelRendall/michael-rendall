// Project content for the projects page. Add, remove or reorder entries here.

/** Icon names available for project previews (see src/components/Icon.astro). */
export type PreviewIcon = 'gamepad' | 'puzzle' | 'grid';

export interface FeaturedProject {
  /** Shown in the card's title bar, e.g. "project_01.exe". */
  file: string;
  name: string;
  summary: string;
  tags: string[];
  /** Placeholder shown until there's a screenshot. */
  icon: PreviewIcon;
  /** Background behind the preview: [from, to] colours of a 135° gradient. */
  previewColours: [string, string];
  /** Colour of the card's offset shadow. */
  shadow: 'mint' | 'pink' | 'lilac';
  demoUrl: string;
  codeUrl: string;
}

export interface MoreProject {
  name: string;
  tech: string[];
  year: string;
  url: string;
}

const placeholder = {
  name: '[PROJECT NAME]',
  summary: '[One or two lines on what it is and the most interesting problem you solved building it.]',
  tags: ['[TECH]', '[TECH]', '[TECH]'],
  demoUrl: '#play',
  codeUrl: 'https://github.com/',
};

export const featuredProjects: FeaturedProject[] = [
  { ...placeholder, file: 'project_01.exe', icon: 'gamepad', previewColours: ['#ffc6e6', '#c3a6ff'], shadow: 'mint' },
  { ...placeholder, file: 'project_02.exe', icon: 'puzzle', previewColours: ['#c9f5f1', '#ffc6e6'], shadow: 'pink' },
  { ...placeholder, file: 'project_03.exe', icon: 'grid', previewColours: ['#d9c8ff', '#9ff3ec'], shadow: 'lilac' },
];

const morePlaceholder: MoreProject = { name: '[PROJECT NAME]', tech: ['[TECH]', '[TECH]'], year: '[YEAR]', url: 'https://github.com/' };

export const moreProjects: MoreProject[] = [morePlaceholder, morePlaceholder, morePlaceholder, morePlaceholder];
