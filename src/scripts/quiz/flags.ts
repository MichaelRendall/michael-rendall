// Flags: name the country from its flag, by typing it or picking from four countries.
import { countries, type Country } from '../../data/countries';
import { shuffle, type QuizDefinition } from './definition';
import { isCorrect } from './match';

/** The country plus three others from the same continent, so the options are plausible neighbours. */
function options(country: Country): string[] {
  const others = countries.filter((other) => other.continent === country.continent && other.code !== country.code);
  return shuffle([
    country.name,
    ...shuffle(others)
      .slice(0, 3)
      .map((other) => other.name),
  ]);
}

export const flagsQuiz: QuizDefinition = {
  id: 'flags',
  unit: 'flags',
  progressLabel: 'Flag',
  modes: ['type', 'choice'],
  intro: {
    type:
      "Name the country for each flag. Type the right name and it's accepted straight away. Stuck? Move on with " +
      "Next and come back later. The quiz ends when you've named them all, or when you give up.",
    choice:
      'Pick the country for each flag from four countries on the same continent. You get one pick per flag, so ' +
      'choose carefully. Use the number keys 1 to 4 if you prefer the keyboard.',
  },
  missedHeading: "Flags you didn't get",
  question: () => 'Which country is this?',
  flagAlt: () => 'The flag to identify',
  answer: (country) => country.name,
  isCorrect,
  options,
  missed: (country, pick) => ({ title: country.name, lines: pick ? [`You picked ${pick}`] : [] }),
};
