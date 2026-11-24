// Shapes quiz settings shared by the quiz and tools/make-shapes.mjs.

/**
 * Island nations drawn close up: only the main island and the islands within a short hop of it, so the
 * outline is a real shape instead of scattered dots across the ocean.
 */
export const SHAPES_CLOSE_UP: readonly string[] = [
  'ag', // Antigua and Barbuda
  'bs', // Bahamas
  'cv', // Cabo Verde
  'fj', // Fiji
  'fm', // Micronesia
  'ki', // Kiribati
  'km', // Comoros
  'nr', // Nauru
  'sb', // Solomon Islands
  'sc', // Seychelles
  'st', // São Tomé and Príncipe
  'to', // Tonga
];

/** Island nations drawn as their largest island alone: nearby islands would still shrink it to a speck. */
export const SHAPES_MAIN_ISLAND: readonly string[] = [
  'pw', // Palau: Babeldaob
  'vc', // Saint Vincent and the Grenadines: Saint Vincent
  'vu', // Vanuatu: Espiritu Santo
];

/**
 * Countries left out of the shapes quiz because no drawing of them is recognisable: coral atolls are
 * thin rings of tiny islets, which zoomed in are just a sliver or a dot.
 */
export const SHAPES_EXCLUDED: readonly string[] = [
  'mh', // Marshall Islands
  'mv', // Maldives
  'tv', // Tuvalu
];
