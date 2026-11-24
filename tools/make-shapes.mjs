// Draws each country's outline for the shapes quiz and writes src/assets/shapes/<code>.svg.
// Run: node tools/make-shapes.mjs   (Node 24: it imports the .ts data files directly)
//
// Source: Natural Earth 1:10m admin 0 countries (public domain), downloaded once into tools/.cache/.
// Borders are Natural Earth's default, de facto ones, with a few pieces merged back so a country reads as
// its familiar whole (see MERGE). For each country the script:
//   1. Gathers its polygons and keeps the main landmass plus anything within GAP_KM of it, so far-flung
//      territories (French Guiana, Hawaii, the Galápagos) don't shrink the mainland to a speck.
//   2. Projects it with an equal-area projection centred on the country, so it isn't stretched, and fits
//      it to a 400 x 300 box (the flags' 4:3 shape).
//   3. Drops specks and simplifies the outline to well under a pixel of error.
import { Buffer } from 'node:buffer';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoDistance } from 'd3-geo';
import { countries } from '../src/data/countries.ts';
import { SHAPES_CLOSE_UP, SHAPES_EXCLUDED, SHAPES_MAIN_ISLAND } from '../src/data/shapes.ts';

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';
const CACHE = new URL('./.cache/ne_10m_admin_0_countries.geojson', import.meta.url);
const OUT_DIR = new URL('../src/assets/shapes/', import.meta.url);
const USER_AGENT = 'country-quiz-data-script/1.0 (static site build tool)';

const WIDTH = 400;
const HEIGHT = 300;
const PADDING = 14;
/** Parts further than this from the rest of the country are left out. */
const GAP_KM = 450;
/** For island nations drawn close up (SHAPES_CLOSE_UP), only islands this close to the main one are kept. */
const CLOSE_UP_GAP_KM = 25;
/** Countries whose parts are all kept, however far apart (Malaysia's two halves are ~600 km apart). */
const KEEP_ALL_PARTS = new Set(['MY']);
/** Natural Earth features merged into a country, by their ADMIN name, so its outline reads as a whole. */
const MERGE = {
  SO: ['Somaliland'],
  CY: ['Northern Cyprus', 'Cyprus No Mans Area', 'Akrotiri Sovereign Base Area', 'Dhekelia Sovereign Base Area'],
  CU: ['US Naval Base Guantanamo Bay'],
};
/** Projected polygons smaller than this (px²) are specks and are dropped. */
const MIN_AREA_PX = 3;
/** Douglas-Peucker tolerance, in px. Coordinates are whole pixels, so this is about the visible limit. */
const TOLERANCE_PX = 0.6;
const FILL = '#2a1347'; // --color-ink: a dark silhouette has strong contrast on the light card (WCAG 1.4.11)
const EARTH_RADIUS_KM = 6371;

async function loadSource() {
  if (!existsSync(CACHE)) {
    console.log('Downloading Natural Earth countries…');
    const response = await fetch(SOURCE_URL, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    await mkdir(new URL('./', CACHE), { recursive: true });
    await writeFile(CACHE, Buffer.from(await response.arrayBuffer()));
  }
  return JSON.parse(await readFile(CACHE, 'utf8'));
}

const asPolygon = (coordinates) => ({ type: 'Polygon', coordinates });

/**
 * GeoJSON draws outer rings anticlockwise; d3-geo reads that on the sphere as "everything except this
 * shape", nearly the whole globe. Flipping such polygons makes areas, centroids and fitting come out right.
 */
const rewind = (polygon) =>
  geoArea(asPolygon(polygon)) > 2 * Math.PI ? polygon.map((ring) => [...ring].reverse()) : polygon;

/** A feature's polygons, each as polygon coordinates (outer ring, then holes), wound for d3-geo. */
const polygonsOf = (feature) =>
  (feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates).map(rewind);

/** Shortest distance between two polygons' outer rings, in km, from a sample of their vertices. */
function gapKm(a, b) {
  const sample = (ring) => {
    const step = Math.max(1, Math.floor(ring.length / 150));
    return ring.filter((_, i) => i % step === 0);
  };
  const pa = sample(a[0]);
  const pb = sample(b[0]);
  let best = Infinity;
  for (const p of pa) for (const q of pb) best = Math.min(best, geoDistance(p, q));
  return best * EARTH_RADIUS_KM;
}

/** The main landmass plus every polygon within `gap` km of the parts already kept. */
function keepNearby(polygons, code, gap) {
  if (KEEP_ALL_PARTS.has(code) || polygons.length === 1) return { kept: polygons, dropped: [] };
  const byArea = [...polygons].sort((a, b) => geoArea(asPolygon(b)) - geoArea(asPolygon(a)));
  const kept = [byArea[0]];
  let rest = byArea.slice(1);
  let added = true;
  while (added) {
    added = false;
    const next = [];
    for (const polygon of rest) {
      if (kept.some((k) => gapKm(k, polygon) <= gap)) {
        kept.push(polygon);
        added = true;
      } else {
        next.push(polygon);
      }
    }
    rest = next;
  }
  return { kept, dropped: rest };
}

/** Douglas-Peucker simplification of a closed ring of [x, y] points. */
function simplify(points, tolerance) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    const [x1, y1] = points[start];
    const [x2, y2] = points[end];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const [x, y] = points[i];
      const distance =
        dx === 0 && dy === 0 ? Math.hypot(x - x1, y - y1) : Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / length;
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const shoelace = (points) => {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
};

/**
 * A ring as a compact path: whole-pixel points, relative moves ("l3 -2"), and repeated points dropped.
 * Whole pixels are plenty for a 400 x 300 silhouette and keep the files small.
 */
function ringPath(points) {
  const whole = points.map(([x, y]) => [Math.round(x), Math.round(y)]);
  const [[startX, startY]] = whole;
  let path = `M${startX} ${startY}`;
  let [lastX, lastY] = [startX, startY];
  for (const [x, y] of whole.slice(1)) {
    if (x === lastX && y === lastY) continue;
    const dx = x - lastX;
    const dy = y - lastY;
    path += `l${dx}${dy < 0 ? '' : ' '}${dy}`;
    [lastX, lastY] = [x, y];
  }
  return `${path}z`;
}

function drawCountry(polygons) {
  const geometry = { type: 'MultiPolygon', coordinates: polygons };
  const [lon, lat] = geoCentroid(geometry);
  const projection = geoAzimuthalEqualArea()
    .rotate([-lon, -lat])
    .fitExtent(
      [
        [PADDING, PADDING],
        [WIDTH - PADDING, HEIGHT - PADDING],
      ],
      geometry,
    );

  const parts = [];
  let specks = 0;
  for (const polygon of polygons) {
    const rings = polygon.map((ring) => ring.map((point) => projection(point)));
    if (shoelace(rings[0]) < MIN_AREA_PX) {
      specks++;
      continue;
    }
    for (const ring of rings) {
      const simple = simplify(ring, TOLERANCE_PX);
      if (simple.length < 4) continue;
      parts.push(ringPath(simple.slice(0, -1)));
    }
  }
  return { d: parts.join(''), specks };
}

const source = await loadSource();
// Several features can share a code (France and Clipperton Island; Kazakhstan and the Baikonur
// Cosmodrome), so every one is kept and merged. The distance rule then drops the far-flung ones.
const byCode = new Map();
const byAdmin = new Map();
for (const feature of source.features) {
  const code = feature.properties.ISO_A2_EH;
  byCode.set(code, [...(byCode.get(code) ?? []), feature]);
  byAdmin.set(feature.properties.ADMIN, feature);
}

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const report = [];
const missing = [];
let totalBytes = 0;
for (const country of countries) {
  if (SHAPES_EXCLUDED.includes(country.code)) continue;
  const code = country.code.toUpperCase();
  const features = byCode.get(code);
  if (!features) {
    missing.push(country.name);
    continue;
  }
  const extras = (MERGE[code] ?? []).map((admin) => {
    const extra = byAdmin.get(admin);
    if (!extra) throw new Error(`${country.name}: no Natural Earth feature called "${admin}" to merge`);
    return extra;
  });
  const polygons = [...features, ...extras].flatMap(polygonsOf);
  // Largest island alone, main island and close neighbours, or the main landmass and anything within GAP_KM.
  const gap = SHAPES_MAIN_ISLAND.includes(country.code)
    ? 0
    : SHAPES_CLOSE_UP.includes(country.code)
      ? CLOSE_UP_GAP_KM
      : GAP_KM;
  const { kept, dropped } = keepNearby(polygons, code, gap);
  const { d, specks } = drawCountry(kept);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}"><path fill="${FILL}" fill-rule="evenodd" d="${d}"/></svg>\n`;
  await writeFile(new URL(`${country.code}.svg`, OUT_DIR), svg);
  totalBytes += svg.length;

  if (dropped.length) {
    const share = dropped.reduce((sum, p) => sum + geoArea(asPolygon(p)), 0);
    const all = polygons.reduce((sum, p) => sum + geoArea(asPolygon(p)), 0);
    report.push(
      `${country.name}: left out ${dropped.length} distant part(s), ${((100 * share) / all).toFixed(1)}% of its area`,
    );
  }
  if (specks) report.push(`${country.name}: ${specks} speck(s) too small to draw`);
}

console.log(report.join('\n'));
console.log(`\nMissing from Natural Earth: ${missing.length ? missing.join(', ') : 'none'}`);
const drawn = countries.length - SHAPES_EXCLUDED.length - missing.length;
console.log(
  `Wrote ${drawn} shapes, ${Math.round(totalBytes / 1024)} KB in all, ${Math.round(totalBytes / drawn)} bytes on average.`,
);
