// Downloads the figures for the higher-or-lower game and writes src/data/country-stats.ts.
// Run: node tools/fetch-country-stats.mjs   (Node 24: it imports countries.ts directly)
//
// Sources:
// - Population, GDP (current US$) and surface area: World Bank open data, most recent year per country.
// - Highest point: Wikidata (each country's "highest point" and that peak's elevation, in metres).
// Fallbacks, only where the World Bank has no figure or an out-of-date one (for example Taiwan, which it
// doesn't cover): the IMF for population and GDP, then Wikidata for population and area. Fallback figures
// are marked with their source in the data file.
// Countries still without a figure are left out of that category, as are GDP figures older than
// MIN_GDP_YEAR: comparing a 2011 economy with a 2025 one isn't a fair question.
import { writeFile } from 'node:fs/promises';
import { countries } from '../src/data/countries.ts';

const OUT = new URL('../src/data/country-stats.ts', import.meta.url);
// Wikidata asks automated clients to identify themselves. Kept generic on purpose.
const USER_AGENT = 'country-quiz-data-script/1.0 (static site build tool)';

const MIN_GDP_YEAR = 2021;

const codes = new Set(countries.map((c) => c.code.toUpperCase()));

const WORLD_BANK = {
  population: 'SP.POP.TOTL',
  gdp: 'NY.GDP.MKTP.CD',
  area: 'AG.SRF.TOTL.K2',
};

// The IMF uses ISO 3166 alpha-3 codes. Most come from the World Bank's country list; these it lacks or differs on.
const ISO3_EXTRAS = { TW: 'TWN', XK: 'UVK' };

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

/** { XX: { value, year } } for one World Bank indicator, latest non-empty year per country. */
async function worldBank(indicator) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&mrnev=1&per_page=1000`;
  const [, rows] = await getJson(url);
  const result = {};
  for (const row of rows ?? []) {
    const code = row.country?.id;
    if (codes.has(code) && row.value !== null) result[code] = { value: row.value, year: Number(row.date) };
  }
  return result;
}

/** { XX: 'XXX' }: alpha-2 to alpha-3 codes, for the IMF. */
async function iso3Codes() {
  const [, rows] = await getJson('https://api.worldbank.org/v2/country?format=json&per_page=500');
  const result = {};
  for (const row of rows ?? []) if (row.iso2Code && row.id) result[row.iso2Code] = row.id;
  return { ...result, ...ISO3_EXTRAS };
}

/**
 * { XX: { value, year, source } } from the IMF DataMapper, for the given countries. Uses `year` if the IMF
 * has it, else its latest earlier year. `scale` converts the IMF's units (millions, billions) to plain numbers.
 */
async function imf(indicator, scale, wanted, iso3, year) {
  const data = await getJson(`https://www.imf.org/external/datamapper/api/v1/${indicator}`);
  const series = data.values?.[indicator] ?? {};
  const result = {};
  for (const code of wanted) {
    const values = series[iso3[code]];
    if (!values) continue;
    const years = Object.keys(values)
      .map(Number)
      .filter((y) => y <= year && values[y] !== null)
      .sort((a, b) => b - a);
    if (years.length) result[code] = { value: values[years[0]] * scale, year: years[0], source: 'IMF' };
  }
  return result;
}

/**
 * { XX: { value, year, source } } from Wikidata for a quantity property (P1082 population, P2046 area),
 * for the given countries. Takes the preferred value, else the most recent. `scale` converts SI units.
 * Quantities with units (area) are read normalised to SI; unitless counts (population) as stated.
 */
async function wikidataQuantity(property, scale, wanted, { normalised = true } = {}) {
  if (!wanted.length) return {};
  const isoList = wanted.map((code) => `"${code}"`).join(' ');
  const query = `
    SELECT ?iso ?amount ?rank ?date WHERE {
      VALUES ?iso { ${isoList} }
      ?country wdt:P297 ?iso ;
               p:${property} ?statement .
      ?statement ${normalised ? 'psn' : 'psv'}:${property}/wikibase:quantityAmount ?amount ;
                 wikibase:rank ?rank .
      OPTIONAL { ?statement pq:P585 ?date . }
      FILTER(?rank != wikibase:DeprecatedRank)
    }`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const data = await getJson(url, { Accept: 'application/sparql-results+json' });
  const best = {};
  for (const row of data.results.bindings) {
    const code = row.iso.value;
    const candidate = {
      value: Number(row.amount.value) * scale,
      preferred: row.rank.value.endsWith('PreferredRank'),
      date: row.date?.value ?? '',
    };
    const current = best[code];
    const better =
      !current ||
      (candidate.preferred && !current.preferred) ||
      (candidate.preferred === current.preferred && candidate.date > current.date);
    if (better) best[code] = candidate;
  }
  const result = {};
  for (const [code, { value, date }] of Object.entries(best)) {
    const year = date ? Number(date.slice(0, 4)) : null;
    // Two decimal places, so a tiny area (Vatican City, 0.49 km²) doesn't round to zero.
    result[code] = { value: Math.round(value * 100) / 100, year, source: 'Wikidata' };
  }
  return result;
}

/**
 * { XX: { metres, name } }: each country's highest point. Where a peak has several heights, Wikidata's
 * preferred value wins (Everest's 8,849 m survey, not older figures); otherwise the tallest.
 * Names fall back to the multilingual label, as some peaks (Denali, Aconcagua) have no English one.
 */
async function highestPoints() {
  const query = `
    SELECT ?iso ?peakLabel ?metres ?rank WHERE {
      ?country wdt:P297 ?iso ;
               wdt:P610 ?peak .
      ?peak p:P2044 ?statement .
      ?statement psn:P2044/wikibase:quantityAmount ?metres ;
                 wikibase:rank ?rank .
      FILTER(?rank != wikibase:DeprecatedRank)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,es,fr". }
    }`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const data = await getJson(url, { Accept: 'application/sparql-results+json' });
  const result = {};
  for (const row of data.results.bindings) {
    const code = row.iso.value.toUpperCase();
    const metres = Math.round(Number(row.metres.value));
    if (!codes.has(code) || !Number.isFinite(metres)) continue;
    const preferred = row.rank.value.endsWith('PreferredRank');
    const current = result[code];
    const better =
      !current || (preferred && !current.preferred) || (preferred === current.preferred && metres > current.metres);
    if (better) result[code] = { metres, name: row.peakLabel.value, preferred };
  }
  for (const entry of Object.values(result)) delete entry.preferred;
  return result;
}

const [population, gdp, area, peaks, iso3] = await Promise.all([
  worldBank(WORLD_BANK.population),
  worldBank(WORLD_BANK.gdp),
  worldBank(WORLD_BANK.area),
  highestPoints(),
  iso3Codes(),
]);

// Fallbacks for gaps. GDP before MIN_GDP_YEAR counts as a gap.
const allCodes = [...codes];
const gaps = (figures, minYear = 0) => allCodes.filter((code) => !(figures[code]?.year >= minYear));
// Match the year most World Bank population figures come from, so fallbacks are as current as the rest.
const latestYear = Math.max(...Object.values(population).map((f) => f.year));
Object.assign(population, await imf('LP', 1e6, gaps(population), iso3, latestYear));
Object.assign(gdp, await imf('NGDPD', 1e9, gaps(gdp, MIN_GDP_YEAR), iso3, latestYear));
Object.assign(population, await wikidataQuantity('P1082', 1, gaps(population), { normalised: false }));
Object.assign(area, await wikidataQuantity('P2046', 1e-6, gaps(area)));

const stats = {};
for (const { code } of countries) {
  const key = code.toUpperCase();
  const entry = {};
  if (population[key]) entry.population = population[key];
  if (gdp[key] && gdp[key].year >= MIN_GDP_YEAR) entry.gdp = gdp[key];
  if (area[key]) entry.area = area[key];
  if (peaks[key]) entry.highestPoint = peaks[key];
  stats[code] = entry;
}

const missing = (field) => countries.filter((c) => !stats[c.code][field]).map((c) => c.name);
const today = new Date().toISOString().slice(0, 10);
const body = `// Generated by tools/fetch-country-stats.mjs on ${today}. Don't edit by hand: rerun the script.
//
// Population, GDP (current US$) and area (km², surface area): World Bank open data, latest year per country.
// Where it has no figure or an out-of-date one, the IMF or Wikidata fills in, marked by \`source\`.
// Highest point: Wikidata, in metres. A country without a figure sits out that category, as does any
// country whose latest GDP figure is older than ${MIN_GDP_YEAR}.

export interface Figure {
  value: number;
  /** Null for a Wikidata figure with no date. */
  year: number | null;
  /** Set only for fallback figures; otherwise the World Bank. */
  source?: 'IMF' | 'Wikidata';
}

export interface CountryStats {
  population?: Figure;
  gdp?: Figure;
  area?: Figure;
  highestPoint?: { metres: number; name: string };
}

export const RETRIEVED = '${today}';

export const countryStats: Record<string, CountryStats> = ${JSON.stringify(stats, null, 2)};
`;
await writeFile(OUT, body);

const fallbacks = (field) =>
  countries
    .filter((c) => stats[c.code][field]?.source)
    .map((c) => `${c.name} (${stats[c.code][field].source} ${stats[c.code][field].year ?? 'undated'})`);
for (const field of ['population', 'gdp', 'area', 'highestPoint']) {
  const gaps = missing(field);
  const filled = fallbacks(field);
  if (filled.length) console.log(`  ${field} fallbacks: ${filled.join(', ')}`);
  console.log(
    `${field}: ${countries.length - gaps.length}/${countries.length}${gaps.length ? `, missing ${gaps.join(', ')}` : ''}`,
  );
}
