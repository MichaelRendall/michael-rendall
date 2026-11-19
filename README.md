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
```

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
- Pixel sizes like `text-[22px]` are deliberate. They match the original design, and they don't set a line height the way Tailwind's named sizes (`text-base` and so on) do.
- Animation hooks are `data-anim="intro" | "window" | "pulse"` attributes, kept separate from styling classes. Inside the scene SVG, GSAP targets the `vw-*` class names and `data-vw-layer` attributes.

## Before you publish

- Replace the text in square brackets: [WHAT YOU BUILD], [PROJECT NAME], [TECH], [YEAR] and [SCREENSHOT OR GIF].
- Update the contact links in `src/pages/index.astro`. They currently point to hello@example.com, github.com and linkedin.com.
- Add a favicon to `public/`.

## Notes

- The animation respects `prefers-reduced-motion`. Visitors who turn motion off see a still scene.
- If JavaScript or GSAP fails to load, the page still shows in full. Only the motion is lost.
- Astro ships no JavaScript of its own. The only script on the page is `main.ts`.
