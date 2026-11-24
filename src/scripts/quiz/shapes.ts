// Shapes: name the country from its outline, by typing it or picking from four countries.
// Countries whose outline isn't recognisable are left out (src/data/shapes.ts).
import { countries, type Country } from '../../data/countries';
import { SHAPES_EXCLUDED } from '../../data/shapes';
import { shuffle, type QuizDefinition } from './definition';
import { isCorrect } from './match';

const shapeCountries = countries.filter((country) => !SHAPES_EXCLUDED.includes(country.code));

/** The country plus three others from the same continent that are also in this quiz. */
function options(country: Country): string[] {
  const others = shapeCountries.filter((o) => o.continent === country.continent && o.code !== country.code);
  return shuffle([
    country.name,
    ...shuffle(others)
      .slice(0, 3)
      .map((other) => other.name),
  ]);
}

export const shapesQuiz: QuizDefinition = {
  id: 'shapes',
  countries: shapeCountries,
  unit: 'shapes',
  progressLabel: 'Shape',
  modes: ['type', 'choice'],
  intro: {
    type: 'Name the country from its outline. Stuck? Skip ahead with Next and come back later.',
    choice: 'Pick the country from its outline. You get one pick each.',
  },
  missedHeading: "Shapes you didn't get",
  question: () => 'Which country is this?',
  imageAlt: () => 'The country outline to identify',
  answer: (country) => country.name,
  isCorrect,
  options,
  missed: (country, pick) => ({ title: country.name, lines: pick ? [`You picked ${pick}`] : [] }),
};
