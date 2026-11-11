// Flow diagrams: packets run only while a figure is on screen and not paused; narrow containers
// swap the wide SVG for a stacked list so labels never render below 13px.
import { still, onMotionChange } from './motion';

const figs = [...document.querySelectorAll<HTMLElement>('[data-flow]')];
const io = new IntersectionObserver((es) => {
  for (const e of es) (e.target as HTMLElement).classList.toggle('live', e.isIntersecting);
}, { threshold: 0.2 });

for (const f of figs) {
  io.observe(f);
  const box = f.querySelector<HTMLElement>('.flow-box')!;
  const need = Number(f.dataset.w) * 0.86;
  const fit = () => f.classList.toggle('stacked', box.clientWidth < need);
  new ResizeObserver(fit).observe(box); fit();

  const ctl = f.querySelector<HTMLButtonElement>('[data-flow-ctl]');
  if (ctl) {
    ctl.addEventListener('click', () => {
      const p = f.classList.toggle('flow-paused');
      ctl.setAttribute('aria-pressed', String(p));
      ctl.textContent = p ? 'Play flow' : 'Pause flow';
    });
  }
  const bar = f.querySelector<HTMLElement>('[data-note-bar]');
  if (bar) {
    const idle = bar.textContent!;
    const notes = [...f.querySelectorAll<HTMLElement>('.flow-notes li')].map((li) => li.textContent!);
    const show = (e: Event) => {
      const g = (e.target as Element).closest<SVGGElement>('.fl-node');
      if (g) bar.textContent = notes[Number(g.dataset.stage)] ?? idle;
    };
    const hide = () => { bar.textContent = idle; };
    f.addEventListener('pointerover', show); f.addEventListener('focusin', show);
    f.addEventListener('pointerleave', hide); f.addEventListener('focusout', hide);
  }
}
onMotionChange(() => figs.forEach((f) => f.classList.toggle('still', still())));
figs.forEach((f) => f.classList.toggle('still', still()));
