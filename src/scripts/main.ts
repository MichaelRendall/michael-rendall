// Michael Rendall: runs on every page. Registers the offline service worker, runs the footer's install
// hint and keeps its copyright year current. Progressive enhancement: the site works without any of them.
import { registerSW } from 'virtual:pwa-register';
import { initInstallHint } from './install-hint';

// Saves the site for offline play. Updates install in the background and apply on the next visit.
registerSW({ immediate: true });

document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

const hint = document.querySelector<HTMLElement>('[data-install-hint]');
if (hint) initInstallHint(hint);
