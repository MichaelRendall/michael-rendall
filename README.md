# Michael Rendall

A personal site for games, quizzes and small tools, with a pastel vaporwave look. It's built with [Astro](https://astro.build), Tailwind CSS v4 and TypeScript. It deploys to Vercel as plain static files.

## Project layout

```
src/
  pages/          index.astro, plus quizzes/ and games/: each an index.astro hub and one file per quiz or game
  layouts/        BaseLayout.astro: <head>, scene, header and footer shared by every page
  components/     Scene (the beach SVG), Backdrop, SiteHeader, SiteFooter, Window,
                  TitleBar, Button, Icon, QuizCard
                  quiz/: Quiz and QuizSettings, the screens and settings every quiz shares
                  settings/: the settings pop-up pieces every game uses (dialog, chips, continents)
  data/           quizzes.ts: the cards on the quizzes page. countries.ts: the countries every quiz uses.
                  capitals.ts: capitals and the cities offered as wrong answers
                  country-stats.ts: population, GDP, area and highest points (generated, see tools/)
                  flag-urls.ts, shape-urls.ts: build-time maps of country code to flag and outline files
                  shapes.ts: how island nations are drawn, and countries left out of the shapes quiz
                  quizzes.ts, games.ts: the cards on the two hub pages
                  charades-prompts.ts: the charades prompts, by category and difficulty
                  blend-in-words.ts: Blend In's secret words, as [word, close cousin] pairs
  scripts/        main.ts: keeps the footer's copyright year current
                  quiz/: the shared quiz engine, settings and answer matching, plus one
                  definition per quiz (flags.ts, capitals.ts, shapes.ts)
                  higher-lower/: the higher-or-lower game and its categories
                  charades/, blend-in/: the party games and their settings
                  settings-dialog.ts: client side of the shared settings pop-up
  styles/         global.css: Tailwind, fonts, colour and shadow tokens
public/           Files copied to the site root unchanged (favicons, robots.txt, images)
tools/            fetch-country-stats.mjs (higher-or-lower figures), make-shapes.mjs (country outlines
                  into src/assets/shapes/), make-grain.py
```

## Run it

You need Node 24 (see `.nvmrc`). Astro needs at least 22.23.4.

```
npm install
npm run dev        # dev server with hot reload at http://localhost:4321
npm run build      # type-check, then build to dist/
npm run preview    # serve the built dist/ locally
npm run check      # type-check only
npm run lint       # ESLint, including accessibility rules for .astro markup
npm run lint:fix   # ESLint with auto-fix
npm run format     # format everything with Prettier (also sorts Tailwind classes)
npm run verify     # format check, lint, type-check and build: run before you push
```

### Editor setup

Open the folder in VS Code and install the recommended extensions when prompted (Astro, Prettier, ESLint, Tailwind CSS IntelliSense). The workspace settings format on save and apply ESLint fixes on save.

### Tooling notes

- ESLint uses `eslint-plugin-jsx-a11y-x`, a maintained fork of `eslint-plugin-jsx-a11y` that supports ESLint 10. `package.json` overrides its `minimatch` dependency to a patched version. Remove the override once the plugin ships the fix itself.
- TypeScript is pinned to 6.x because `@astrojs/check` doesn't support TypeScript 7 yet.
- `Scene.astro` is excluded from Prettier so the SVG artwork keeps its exported layout.

## Deploy

Vercel builds the site on every push to the connected Git repository. Production deploys come from the default branch, and every other branch gets a preview URL. To deploy without Git, run `npx vercel` (preview) or `npx vercel --prod`.

## Installable app and offline play

The site is a PWA (installable web app), named Mike's Quizzes, shown as Quizzes under its icon. `@vite-pwa/astro` in `astro.config.ts` writes the manifest and a service worker that saves every page, script, font, flag and outline on the first visit (about 0.85 MB to download), so every game works offline. New deploys download in the background and take over on the next visit.

- The service worker only runs in a production build: test offline with `npm run build` then `npm run preview`, and check Chrome DevTools > Application.
- App icons live in `public/icons/`. To remake them after changing `public/favicon.svg`, run `npx pwa-assets-generator --config tools/pwa-assets.config.mjs` and copy the three files it lists into `public/icons/`.
- The home page's install hint (`src/scripts/install-hint.ts`) only shows where its instructions are right: Share, then Add to Home Screen on iPhone, or an Install button where the browser offers one.

## Common changes

- **Add a quiz:** write a definition in `src/scripts/quiz/<name>.ts` (see `definition.ts` and the two existing quizzes), create `src/pages/quizzes/<name>.astro` using the `Quiz` component (copy `flags.astro`), then add a card in `src/data/quizzes.ts` with `href: '/quizzes/<name>'`. A card without an `href` shows as "Coming soon".
- **Update the higher-or-lower figures:** run `node tools/fetch-country-stats.mjs`. It downloads the latest World Bank and Wikidata figures and rewrites `src/data/country-stats.ts`, then lists any gaps. Review the diff before committing.
- **Redraw the country outlines:** run `node tools/make-shapes.mjs`. It downloads Natural Earth's country boundaries once (cached in `tools/.cache/`), redraws `src/assets/shapes/` and reports what it left out. To leave a country out of the shapes quiz, add it to `src/data/shapes.ts` and rerun.
- **Add a higher-or-lower category:** add a field to the script, rerun it, and add an entry in `src/scripts/higher-lower/categories.ts`.
- **Edit Blend In's words:** edit `src/data/blend-in-words.ts`. Each entry is a word and a close cousin; Undercover mode gives the outsider the cousin.
- **Edit the charades prompts:** edit `src/data/charades-prompts.ts`. Categories and difficulty levels are lists there; the game picks up any changes.
- **Add a game:** create `src/pages/games/<name>.astro` wrapped in `<BaseLayout page="games">`, then add a card in `src/data/games.ts` with `href: '/games/<name>'`.
- **Add a page:** create `src/pages/<name>.astro` and wrap it in `<BaseLayout>`. It's served at `/<name>` (Vercel's `cleanUrls`). Add a link in `SiteHeader.astro`, and add the page to `BaseLayout`'s `page` prop type.
- **Change colours or fonts:** edit the `@theme` block in `src/styles/global.css`. Every `bg-*`, `text-*`, `border-*` and `shadow-*` class picks up the change.
- **Change the favicon:** edit `public/favicon.svg`. Modern browsers use it directly. `favicon.ico` (for older browsers) and `apple-touch-icon.png` (for iOS home screens) are PNG renders of it, so export new copies at 32px and 180px when the SVG changes.
- **Swap a font:** install it from [Fontsource](https://fontsource.org) (`npm install @fontsource/<font-name>`), replace its `@import` in `global.css`, and update `--font-pixel`, `--font-terminal` or `--font-sans`.

## Styling conventions

- Styles are Tailwind classes in the components. Colours, fonts and shadows are named tokens (`text-ink`, `bg-paper`, `font-terminal`, `shadow-hard-4 shadow-pink`), so avoid hex values in markup.
- The retro offset shadows are `shadow-hard-3/4/8/10`. They're mint by default; add `shadow-pink` or `shadow-lilac` to recolour them.
- Sizes are in rem (and letter-spacing in em), so the site follows the visitor's browser font size. Use the named type sizes from `global.css` (`text-label`, `text-body`, `text-title`, `text-display` and so on) rather than Tailwind's defaults. Ours don't set a line height, so text keeps the design's `normal` line height unless you add a `leading-*` class.
- Px is used only where it's best practice: borders, focus outlines, the hard offset shadows, the scanlines and the intro animation distances. These are fine details that should stay crisp, not grow with the text.
- Use the `short:` variant to tighten layouts on laptop-width screens that are 800px tall or less.
- The only animation is a short CSS intro on elements with `data-anim="window"` or `data-anim="intro"` (see `global.css`). The background scene is static.

## Notes

- The intro animation is skipped for visitors who turn on reduced motion.
- If JavaScript fails to load, every page except the quizzes still works in full.
- Astro ships no JavaScript of its own. Every page runs `main.ts`; quiz pages add their own game script.
