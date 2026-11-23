// The higher-or-lower categories: what's compared, how it's shown and how each question reads.
// Figures come from src/data/country-stats.ts (World Bank and Wikidata; see tools/fetch-country-stats.mjs).
import { nameInSentence, type Country } from '../../data/countries';
import { countryStats } from '../../data/country-stats';

export const CATEGORY_IDS = ['population', 'gdp', 'area', 'height'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  /** Settings chip and summary label. */
  label: string;
  value(country: Country): number | undefined;
  /** For display and for deciding ties, so two figures that read the same count as equal. */
  rounded(value: number): number;
  format(value: number): string;
  /** An optional extra line under the value, e.g. the peak's name. */
  detail?(country: Country): string | undefined;
  /** Asks about `b` relative to `a`, e.g. "Is Chile bigger or smaller than Peru?". */
  question(a: Country, b: Country): string;
  higherLabel: string;
  lowerLabel: string;
  /** "Close calls" pairs countries whose figures are within this ratio of each other. */
  closeRatio: number;
}

/** Three significant figures: 34,584,000 reads as 34.6 million. */
const threeFigures = (n: number): number => Number(n.toPrecision(3));
const number = (n: number): string => n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

/** 9,490 / 34.6 million / 1.41 billion / 19.5 trillion. */
function large(n: number): string {
  const r = threeFigures(n);
  if (r >= 1e12) return `${number(r / 1e12)} trillion`;
  if (r >= 1e9) return `${number(r / 1e9)} billion`;
  if (r >= 1e6) return `${number(r / 1e6)} million`;
  return number(r);
}

/** "Chile's", or "the Bahamas'" for names ending in s. */
const possessive = (country: Country): string => {
  const name = nameInSentence(country);
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
};

export const CATEGORIES: Record<CategoryId, Category> = {
  population: {
    id: 'population',
    label: 'Population',
    value: (c) => countryStats[c.code]?.population?.value,
    rounded: threeFigures,
    format: (v) => `${large(v)} people`,
    question: (a, b) => `Does ${nameInSentence(b)} have a higher or lower population than ${nameInSentence(a)}?`,
    higherLabel: 'Higher',
    lowerLabel: 'Lower',
    closeRatio: 3,
  },
  gdp: {
    id: 'gdp',
    label: 'GDP',
    value: (c) => countryStats[c.code]?.gdp?.value,
    rounded: threeFigures,
    format: (v) => `$${large(v)}`,
    question: (a, b) => `Is ${possessive(b)} GDP higher or lower than ${possessive(a)}?`,
    higherLabel: 'Higher',
    lowerLabel: 'Lower',
    closeRatio: 3,
  },
  area: {
    id: 'area',
    label: 'Area',
    value: (c) => countryStats[c.code]?.area?.value,
    rounded: threeFigures,
    format: (v) => `${large(v)} km²`,
    question: (a, b) => `Is ${nameInSentence(b)} bigger or smaller than ${nameInSentence(a)}?`,
    higherLabel: 'Bigger',
    lowerLabel: 'Smaller',
    closeRatio: 3,
  },
  height: {
    id: 'height',
    label: 'Highest point',
    value: (c) => countryStats[c.code]?.highestPoint?.metres,
    rounded: (v) => v,
    format: (v) => `${number(v)} m`,
    detail: (c) => countryStats[c.code]?.highestPoint?.name,
    question: (a, b) => `Is ${possessive(b)} highest point higher or lower than ${possessive(a)}?`,
    higherLabel: 'Higher',
    lowerLabel: 'Lower',
    closeRatio: 1.6,
  },
};
