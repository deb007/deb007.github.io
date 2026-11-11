// Core site script: reveals, nav indicator, and lazy loading of the decorative canvases.

const root = document.documentElement;

// Reveal-on-entry: headings and hairlines, once.
document.querySelectorAll('main h1, main h2').forEach((h) => { if (!h.closest('.hero')) h.classList.add('rv'); });
const targets = document.querySelectorAll<HTMLElement>('.rv, .hl-line, .closing');
if (targets.length) {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.15 });
  targets.forEach((el, i) => { el.style.setProperty('--i', String(i % 4)); io.observe(el); });
}

// Sliding navigation underline.
const nav = document.querySelector<HTMLElement>('.site-header nav');
if (nav) {
  const ind = document.createElement('span');
  ind.className = 'nav-ind'; ind.setAttribute('aria-hidden', 'true');
  nav.appendChild(ind);
  const cur = nav.querySelector<HTMLElement>('a[aria-current="page"]');
  const to = (a: HTMLElement | null) => {
    if (!a) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1'; ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  to(cur);
  root.classList.add('nav-ready');
  requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.add('anim')));
  nav.addEventListener('pointerover', (e) => { const a = (e.target as Element).closest('a'); if (a) to(a as HTMLElement); });
  nav.addEventListener('focusin', (e) => { const a = (e.target as Element).closest('a'); if (a) to(a as HTMLElement); });
  const back = () => to(cur);
  nav.addEventListener('pointerleave', back);
  nav.addEventListener('focusout', back);
  addEventListener('resize', back);
}

// Decorative canvases: separate lazy chunks, requested only after load and first paint.
const saveData = (navigator as any).connection?.saveData === true;
// Waits for the browser's own first-contentful-paint entry, then a frame and idle time, so the
// lazy chunks are never requested before the poster has painted.
const afterPaint = (fn: () => void) => {
  const go = () => requestAnimationFrame(() => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200)));
  let fired = false, timer = 0;
  const painted = () => {
    if (fired) return; fired = true; clearTimeout(timer);
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  };
  if (performance.getEntriesByName('first-contentful-paint').length) return painted();
  try {
    const po = new PerformanceObserver((l) => {
      if (l.getEntriesByName('first-contentful-paint').length) { po.disconnect(); painted(); }
    });
    po.observe({ type: 'paint', buffered: true });
    timer = window.setTimeout(() => { po.disconnect(); painted(); }, 3000);
  } catch { painted(); }
};
const hasCanvas = !!document.createElement('canvas').getContext;

const hero = document.getElementById('hero-globe') as HTMLCanvasElement | null;
if (hero && hasCanvas && !saveData) {
  afterPaint(async () => {
    try {
      const { startGlobe } = await import('../globe/globe');
      if (startGlobe(hero, document.getElementById('hero-visual')!)) hero.classList.add('on');
    } catch { /* poster stays */ }
  });
}
const earth = document.getElementById('earth') as HTMLCanvasElement | null;
if (earth && hasCanvas && !saveData) {
  const start = async () => {
    try {
      const { startEarth } = await import('../globe/earth');
      if (startEarth(earth)) earth.classList.add('on');
    } catch { /* band stays plain */ }
  };
  const lo = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { lo.disconnect(); afterPaint(start); } }, { rootMargin: '300px' });
  lo.observe(earth);
}
