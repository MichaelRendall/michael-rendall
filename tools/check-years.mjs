// Checks Guess the Year's years against Wikidata. Run: node tools/check-years.mjs
// For each prompt with a search term (an English Wikipedia article title), it finds the article's Wikidata
// item, reads its date properties, and reports any prompt whose year isn't among them. It changes nothing:
// fix src/data/guess-the-year.ts by hand, checking another source where Wikidata seems wrong.
import { CATEGORIES, CHECKED_DIFFERENCES, prompts } from '../src/data/guess-the-year.ts';

const USER_AGENT = 'country-quiz-data-script/1.0 (static site build tool)';

// Date properties that can date a prompt: publication, inception, point in time, start time, first
// performance, first flight, service entry, official opening, birth, discovery, launch.
const DATE_PROPERTIES = ['P577', 'P571', 'P585', 'P580', 'P1191', 'P606', 'P729', 'P1619', 'P569', 'P575', 'P619'];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polite to the public APIs: a short pause before each request, and when asked to slow down (429),
// waits as long as the server says (or a growing delay) before trying again.
const getJson = async (url, attempt = 1) => {
  await wait(500);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (response.status === 429 && attempt <= 5) {
    const seconds = Number(response.headers.get('retry-after')) || 10 * attempt;
    console.log(`Rate limited; waiting ${seconds}s before retrying…`);
    await wait(seconds * 1000);
    return getJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.json();
};

const chunks = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

const entries = CATEGORIES.flatMap((category) =>
  prompts[category].map(([text, year, search]) => ({ category, text, year, search })),
);
const checkable = entries.filter((entry) => entry.search && !(entry.text in CHECKED_DIFFERENCES));

// 1. Article titles to Wikidata ids, following redirects.
const itemByTitle = new Map();
for (const batch of chunks([...new Set(checkable.map((e) => e.search))], 50)) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(batch.join('|'))}`;
  const data = await getJson(url);
  const resolved = new Map(batch.map((title) => [title, title]));
  for (const step of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) {
    for (const [title, current] of resolved) if (current === step.from) resolved.set(title, step.to);
  }
  const pages = new Map(data.query.pages.map((page) => [page.title, page.pageprops?.wikibase_item]));
  for (const [title, final] of resolved) itemByTitle.set(title, pages.get(final));
}

// 2. Each item's years from its date properties.
const yearsByItem = new Map();
const ids = [...new Set([...itemByTitle.values()].filter(Boolean))];
for (const batch of chunks(ids, 50)) {
  const data = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${batch.join('|')}`,
  );
  for (const [id, entity] of Object.entries(data.entities)) {
    const years = [];
    for (const property of DATE_PROPERTIES) {
      for (const claim of entity.claims?.[property] ?? []) {
        const time = claim.mainsnak?.datavalue?.value?.time;
        if (time) years.push({ property, year: Number(time.slice(1, 5)) * (time.startsWith('-') ? -1 : 1) });
      }
    }
    yearsByItem.set(id, years);
  }
}

// 3. Report.
let ok = 0;
const problems = [];
for (const entry of checkable) {
  const id = itemByTitle.get(entry.search);
  const years = id ? (yearsByItem.get(id) ?? []) : [];
  if (!id) problems.push(`NOT FOUND  ${entry.text}  (search "${entry.search}")`);
  else if (!years.length) problems.push(`NO DATES   ${entry.text}  (${id})`);
  else if (years.some((y) => y.year === entry.year)) ok++;
  else
    problems.push(
      `MISMATCH   ${entry.text}: ours ${entry.year}, Wikidata ${years.map((y) => `${y.year} (${y.property})`).join(', ')}  (${id})`,
    );
}
console.log(`${Object.keys(CHECKED_DIFFERENCES).length} known differences skipped (see CHECKED_DIFFERENCES).`);
const unchecked = entries.filter((entry) => !entry.search);
console.log(problems.join('\n'));
console.log(`\n${ok} of ${checkable.length} checked prompts match Wikidata. ${problems.length} to review.`);
console.log(`${unchecked.length} prompts have no search term and need checking by hand:`);
console.log(unchecked.map((e) => `  ${e.text} (${e.year})`).join('\n'));
