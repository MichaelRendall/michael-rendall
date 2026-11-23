// Capitals: pick the capital from four cities in the same country.
import { countries, type Country } from '../../data/countries';
import { capitals, type CapitalInfo } from '../../data/capitals';
import { shuffle, type QuizDefinition } from './definition';

const infoFor = (country: Country): CapitalInfo => capitals[country.code];

/** Extra results lines: other official capitals ("Also La Paz") and any note. */
const extraLines = (info: CapitalInfo): string[] => [
  ...(info.also?.length ? [`Also ${info.also.join(', ')}`] : []),
  ...(info.note ? [info.note] : []),
];

/**
 * The capital plus three wrong options: other cities in the same country. Small countries with fewer than
 * three other cities are topped up with capitals from the same continent. A country's other official
 * capitals are never offered as wrong answers.
 */
function options(country: Country): string[] {
  const info = infoFor(country);
  const notWrong = new Set([info.capital, ...(info.also ?? [])]);
  const wrong = shuffle(info.cities.filter((city) => !notWrong.has(city))).slice(0, 3);
  if (wrong.length < 3) {
    const nearby = countries
      .filter((other) => other.continent === country.continent && other.code !== country.code)
      .map((other) => infoFor(other).capital)
      .filter((city) => !notWrong.has(city) && !wrong.includes(city));
    wrong.push(...shuffle(nearby).slice(0, 3 - wrong.length));
  }
  return shuffle([info.capital, ...wrong]);
}

export const capitalsQuiz: QuizDefinition = {
  id: 'capitals',
  unit: 'questions',
  progressLabel: 'Question',
  modes: ['choice'],
  intro: {
    choice:
      'Pick the capital of each country from four cities in that country. You get one pick per question, so ' +
      'choose carefully. Use the number keys 1 to 4 if you prefer the keyboard.',
  },
  missedHeading: 'Capitals you missed',
  question: (country) => `What's the capital of ${country.name}?`,
  flagAlt: (country) => `Flag of ${country.name}`,
  answer: (country) => infoFor(country).capital,
  options,
  missed: (country, pick) => {
    const info = infoFor(country);
    return {
      title: `${country.name}: ${info.capital}`,
      lines: [...extraLines(info), ...(pick ? [`You picked ${pick}`] : [])],
    };
  },
};
