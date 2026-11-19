# Michael Rendall: portfolio

A two-page static site with a pastel vaporwave look. It's built with [Astro](https://astro.build), Tailwind CSS v4 and TypeScript, with GSAP for the gentle motion. It deploys to Vercel as plain static files.

## Project layout

```
src/
  pages/          index.astro and projects.astro. Each file is a page.
  layouts/        BaseLayout.astro: <head>, scene, header and footer shared by every page
  components/     Scene (the beach SVG), Backdrop, SiteHeader, SiteFooter, Window,
                  TitleBar, Button, Icon, ProjectCard, ProjectListItem
  data/           projects.ts: the content for the projects page
  scripts/        main.ts: footer clock (Glasgow time), year, and all GSAP animation
  styles/         global.css: Tailwind, fonts, colour and shadow tokens
public/           Files copied to the site root unchanged (favicon, robots.txt, images)
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

## Common changes

- **Add or edit a project:** edit `src/data/projects.ts`. The cards and the list are built from it.
- **Add a page:** create `src/pages/<name>.astro` and wrap it in `<BaseLayout>`. It builds to `/<name>.html`. Add a link in `SiteHeader.astro`, and add the page to `BaseLayout`'s `page` prop type.
- **Change colours or fonts:** edit the `@theme` block in `src/styles/global.css`. Every `bg-*`, `text-*`, `border-*` and `shadow-*` class picks up the change.
- **Swap a font:** install it from [Fontsource](https://fontsource.org) (`npm install @fontsource/<font-name>`), replace its `@import` in `global.css`, and update `--font-pixel`, `--font-terminal` or `--font-sans`.

## Styling conventions

- Styles are Tailwind classes in the components. Colours, fonts and shadows are named tokens (`text-ink`, `bg-paper`, `font-terminal`, `shadow-hard-4 shadow-pink`), so avoid hex values in markup.
- The retro offset shadows are `shadow-hard-3/4/8/10`. They're mint by default; add `shadow-pink` or `shadow-lilac` to recolour them.
- Sizes are in rem (and letter-spacing in em), so the site follows the visitor's browser font size. Use the named type sizes from `global.css` (`text-label`, `text-body`, `text-title`, `text-display` and so on) rather than Tailwind's defaults. Ours don't set a line height, so text keeps the design's `normal` line height unless you add a `leading-*` class.
- Px is used only where it's best practice: borders, focus outlines, the hard offset shadows, the scanlines and GSAP motion distances. These are fine details that should stay crisp, not grow with the text.
- Use the `short:` variant to tighten layouts on laptop-width screens that are 800px tall or less.
- Animation hooks are `data-anim="intro" | "window" | "pulse"` attributes, kept separate from styling classes. Inside the scene SVG, GSAP targets the `vw-*` class names and `data-vw-layer` attributes.

## Before you publish

- Replace the text in square brackets: [WHAT YOU BUILD], [PROJECT NAME], [TECH], [YEAR] and [SCREENSHOT OR GIF].
- Update the contact links in `src/pages/index.astro`. They currently point to hello@example.com, github.com and linkedin.com.
- Add a favicon to `public/`.

## Notes

- The animation respects `prefers-reduced-motion`. Visitors who turn motion off see a still scene.
- If JavaScript or GSAP fails to load, the page still shows in full. Only the motion is lost.
- Astro ships no JavaScript of its own. The only script on the page is `main.ts`.
