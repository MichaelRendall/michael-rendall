# Michael Rendall: portfolio

A two-page static site with a pastel vaporwave look. It uses HTML, CSS and TypeScript, plus GSAP for the gentle motion. Vite handles the dev server and production build, and the site deploys to Vercel.

## Files

- `index.html`: the homepage, with the intro window and contact links
- `projects.html`: three featured project cards and a list of other projects
- `src/styles.css`: shared styles (accent colour, retro buttons and boxes, scanlines)
- `src/main.ts`: the footer clock (always Glasgow time), the current year, and all the GSAP animation
- `public/`: files copied to the site root unchanged (favicon, `robots.txt`, images)
- `vite.config.ts`: build config. Every HTML page must be listed under `input`.
- `vercel.json`: Vercel build settings and caching for hashed assets

## Run it

You need Node 22 (see `.nvmrc`).

```
npm install
npm run dev        # dev server with hot reload
npm run build      # typecheck, then build to dist/
npm run preview    # serve the built dist/ locally
npm run typecheck  # typecheck only
```

## Deploy

Vercel builds the site on every push to the connected Git repository. Production deploys come from the default branch, and every other branch gets a preview URL. To deploy without Git, run `npx vercel` (preview) or `npx vercel --prod`.

## Adding a page

1. Create the HTML file in the project root, with `<link rel="stylesheet" href="/src/styles.css">` and `<script type="module" src="/src/main.ts"></script>` in the head.
2. Add it to `build.rollupOptions.input` in `vite.config.ts`. Pages left out of that list are missing from the build.

## Before you publish

- Replace the text in square brackets: [WHAT YOU BUILD], [PROJECT NAME], [TECH], [YEAR] and [SCREENSHOT OR GIF].
- Update the contact links. They currently point to hello@example.com, github.com and linkedin.com.
- Change the accent colour by editing `--accent` in `src/styles.css`.
- Fonts are self-hosted with [Fontsource](https://fontsource.org). To use a different heading font, install its package (`npm install @fontsource/<font-name>`), swap the `@import` lines at the top of `src/styles.css`, and replace `'Silkscreen'` in both HTML files.

## Notes

- The animation respects `prefers-reduced-motion`. Visitors who turn motion off see a still scene.
- If JavaScript or GSAP fails to load, the page still shows in full. Only the motion is lost.
- The beach scene is inline SVG, copied into both pages. If you move to React or another framework, make the scene, the header and the window into shared components so it lives in one place.
- Most styles are inline because the design was exported from a prototype. Moving the repeated ones (window title bars, buttons, tags) into classes in `src/styles.css` is a good first tidy-up.
