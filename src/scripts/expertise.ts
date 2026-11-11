// Expertise accordion: one row open at a time (hover, focus or click). Thin lines connect the open
// domain to the projects that exercise it. Lines are drawn by CSS transitions, so reduced motion and
// the pause control show them already drawn.
const root = document.querySelector<HTMLElement>('[data-exp]');
if (root) {
  const rows = [...root.querySelectorAll<HTMLElement>('.exp-row')];
  const svg = root.querySelector<SVGSVGElement>('.exp-lines')!;
  const side = root.querySelector<HTMLElement>('.exp-side')!;
  const NS = 'http://www.w3.org/2000/svg';
  const hover = matchMedia('(hover: hover) and (pointer: fine)');

  function lines() {
    svg.replaceChildren();
    root!.querySelectorAll('.exp-side li').forEach((li) => li.classList.remove('hit'));
    const row = rows.find((r) => r.dataset.open === 'true');
    if (!row || getComputedStyle(side).display === 'none') return;
    const base = root!.getBoundingClientRect();
    const btn = row.querySelector<HTMLElement>('.exp-name')!.getBoundingClientRect();
    const list = row.getBoundingClientRect();
    const x1 = list.right - base.left, y1 = btn.top + btn.height / 2 - base.top;
    for (const slug of (row.dataset.ex ?? '').split(' ').filter(Boolean)) {
      const li = side.querySelector<HTMLElement>(`li[data-p="${slug}"]`);
      if (!li) continue;
      li.classList.add('hit');
      const r = li.getBoundingClientRect();
      const x2 = r.left - base.left - 8, y2 = r.top + r.height / 2 - base.top, xm = x1 + (x2 - x1) * 0.55;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x1} ${y1}C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}`);
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', 'exp-line');
      svg.appendChild(p);
    }
    svg.setAttribute('width', String(base.width)); svg.setAttribute('height', String(base.height));
    // Draw on the next frame so the transition runs from the undrawn state.
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('drawn')));
    svg.classList.remove('drawn');
  }

  function open(row: HTMLElement) {
    if (row.dataset.open === 'true') return;
    for (const r of rows) {
      const on = r === row;
      r.dataset.open = String(on);
      r.querySelector('.exp-btn')!.setAttribute('aria-expanded', String(on));
    }
    lines();
    setTimeout(lines, 420); // after the panel height transition settles
  }

  for (const r of rows) {
    const b = r.querySelector<HTMLElement>('.exp-btn')!;
    b.addEventListener('click', () => open(r));
    b.addEventListener('focus', () => open(r));
    r.addEventListener('pointerenter', () => { if (hover.matches) open(r); });
  }
  addEventListener('resize', lines);
  document.fonts?.ready.then(lines);
  lines();
  setTimeout(lines, 450);
}
