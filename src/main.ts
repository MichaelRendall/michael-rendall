// Michael Rendall portfolio: clock, year and gentle GSAP motion.
// Everything here is progressive enhancement: the page works without it.
import { gsap } from 'gsap';

// Footer clock shows Glasgow time, whatever the visitor's time zone.
const clockEls = document.querySelectorAll<HTMLElement>('[data-clock]');
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const tick = (): void => clockEls.forEach((el) => { el.textContent = fmt.format(new Date()); });
tick();
setInterval(tick, 10000);

document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

const root = document.querySelector<HTMLElement>('[data-vw-root]');
if (root) initMotion(root);

function initMotion(root: HTMLElement): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const q = (sel: string): Element[] => Array.from(root.querySelectorAll(sel));

  // Intro: a soft settle
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(q('[data-vw-layer="moon"]'), { y: 30, opacity: 0, duration: 2, ease: 'expo.out' }, 0)
    .from(q('[data-vw-layer="clouds"]'), { opacity: 0, duration: 1.6 }, 0)
    .from(q('[data-vw-layer="palms"]'), { y: 40, duration: 1.6 }, 0.1)
    .from(q('.vw-window'), { y: 28, opacity: 0, duration: 0.9, clearProps: 'transform,opacity' }, 0.5)
    .from(q('.vw-intro'), { y: 14, opacity: 0, duration: 0.8, stagger: 0.1, clearProps: 'transform,opacity' }, 0.8);

  // Ambient: slow, small, looping
  q('.vw-cloud-g').forEach((el, i) => {
    gsap.to(el, { x: i % 2 ? -26 : 26, duration: 16 + i * 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
  q('.vw-fronds, .vw-fronds-far').forEach((el, i) => {
    const ox = el.getAttribute('data-ox');
    const oy = el.getAttribute('data-oy');
    gsap.to(el, { rotation: i % 2 ? -2.5 : 2.5, svgOrigin: `${ox} ${oy}`, duration: 3.2 + (i % 3) * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
  q('.vw-boat').forEach((el, i) => {
    gsap.to(el, { y: '+=3', rotation: i % 2 ? 2 : -2, transformOrigin: '50% 100%', duration: 2.2 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
  gsap.to(q('.vw-spark'), { opacity: 0.1, duration: 1.4, ease: 'sine.inOut', stagger: { each: 0.04, from: 'random', yoyo: true, repeat: -1 } });
  gsap.to(q('.vw-twinkle'), { opacity: 0.2, duration: 1.8, ease: 'sine.inOut', stagger: { each: 0.25, from: 'random', yoyo: true, repeat: -1 } });
  gsap.to(q('.vw-glint'), { scaleX: 0.85, transformOrigin: '50% 50%', duration: 2.4, ease: 'sine.inOut', stagger: { each: 0.3, yoyo: true, repeat: -1 } });
  gsap.to(q('.vw-dot'), { boxShadow: '0 0 0 8px rgba(31,184,168,0)', duration: 1.6, ease: 'sine.out', repeat: -1 });
  gsap.to(q('.vw-halo'), { opacity: 0.6, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to(q('.vw-foam'), { strokeDashoffset: -222, duration: 14, ease: 'none', repeat: -1 });
  gsap.to(q('.vw-screen'), { opacity: 0.82, duration: 0.12, ease: 'none', yoyo: true, repeat: -1, repeatDelay: 3.5 });
  gsap.to(q('.vw-birds'), { x: 40, y: -10, duration: 20, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  // Parallax: far layers move less than near ones
  const depth = { clouds: 4, moon: 6, far: 8, city: 12, near: 18, palms: 28 } as const;
  type Mover = { d: number; x: gsap.QuickToFunc; y: gsap.QuickToFunc };
  const movers: Mover[] = [];
  (Object.keys(depth) as (keyof typeof depth)[]).forEach((k) => {
    q(`[data-vw-layer="${k}"]`).forEach((el) => {
      movers.push({
        d: depth[k],
        x: gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 1.4, ease: 'power3.out' }),
      });
    });
  });
  root.addEventListener('pointermove', (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    movers.forEach((m) => { m.x(-nx * m.d); m.y(-ny * m.d * 0.4); });
  });
}
