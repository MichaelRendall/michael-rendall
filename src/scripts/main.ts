// Michael Rendall: footer clock and year.
// Everything here is progressive enhancement: the page works without it.

// Footer clock shows Glasgow time, whatever the visitor's time zone.
const clockEls = document.querySelectorAll<HTMLElement>('[data-clock]');
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const tick = (): void =>
  clockEls.forEach((el) => {
    el.textContent = fmt.format(new Date());
  });
tick();
setInterval(tick, 10000);

document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});
