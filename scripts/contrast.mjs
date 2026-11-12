// WCAG contrast for the token pairs in use. Reads src/styles/tokens.css and the globe palettes.
import { readFileSync } from 'node:fs';
const css = readFileSync('src/styles/tokens.css', 'utf8');
const block = (re) => Object.fromEntries([...css.match(re)[0].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const dark = block(/:root \{[\s\S]*?\n\}/), light = block(/:root\[data-theme='light'\] \{[\s\S]*?\n\}/);
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, p) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p)).toString(16).padStart(2, '0')).join('');
let fail = 0;
function check(name, fg, bg, min) { const r = ratio(fg, bg); const ok = r >= min; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 (need ${min})  ${name}  ${fg} on ${bg}`); }
for (const [n, t] of [['dark', dark], ['light', light]]) {
  const panel = mix(t.accent, t.bg, 0.1), panelS = t.surface, layer = mix(t.accent, t.bg, 0.14);
  console.log(`-- ${n}`);
  check('body text on page', t.text, t.bg, 4.5);
  check('muted text on page', t['text-muted'], t.bg, 4.5);
  check('muted text on panel', t['text-muted'], panelS, 4.5);
  check('body text on panel', t.text, panelS, 4.5);
  check('expertise inactive titles (--text-muted) on --surface panel', t['text-muted'], panelS, 4.5);
  check('mono labels / tags / metadata (--text-muted) on page', t['text-muted'], t.bg, 4.5);
  check('status label (accent text) on page', t['accent-text'], t.bg, 4.5);
  check('muted text on three-layer row (darkest tint)', t['text-muted'], layer, 4.5);
  check('accent text on page (labels, links)', t['accent-text'], t.bg, 4.5);
  check('accent text on panel', t['accent-text'], panelS, 4.5);
  check('diagram node text on node fill', t.text, panel, 4.5);
  check('diagram integration text (muted) on panel', t['text-muted'], panelS, 4.5);
  check('white on accent button', '#ffffff', t.accent, 4.5);
  check('accent stroke on page (non-text 3:1)', t.accent, t.bg, 3);
  check('hairline on page (decorative)', t.line, t.bg, 1.5);
}
// Text over the bottom Earth: the scrim is a radial wash of --bg at 88% over the canvas; worst case is the lit rim.
for (const [n, t, rim] of [['dark', dark, '#5aa0ff'], ['light', light, '#1f5fa8']]) {
  const under = mix(t.bg, rim, 0.88);
  console.log(`-- closing band over horizon (${n}): scrim 88% ${t.bg} over brightest rim ${rim} = ${under}`);
  check('closing headline over scrim', t.text, under, 4.5);
  check('closing kicker over scrim', t['accent-text'], under, 4.5);
}
// Hero copy sits on the page background, outside the globe canvas (separate grid column).
console.log(fail ? `${fail} failing pair(s)` : 'all pairs pass');
process.exit(fail ? 1 : 0);
