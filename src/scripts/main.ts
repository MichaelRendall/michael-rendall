// Michael Rendall: keeps the footer's copyright year current.
// Progressive enhancement: the year is also rendered at build time, so it shows without JavaScript.
document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});
