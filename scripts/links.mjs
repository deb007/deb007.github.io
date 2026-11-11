// Link check of dist/: every internal href/src resolves to a built file; reports external hosts.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'; import { join } from 'node:path';
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pages = walk('dist').filter((f) => f.endsWith('.html')); const dead = new Set(); const ext = new Set(); let n = 0;
for (const f of pages) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let u = m[1]; if (u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('data:')) continue;
    if (/^https?:/.test(u)) { ext.add(new URL(u).origin); continue; }
    u = u.split('#')[0].split('?')[0]; n++;
    const p = join('dist', u.endsWith('/') ? u + 'index.html' : u);
    if (!existsSync(p)) dead.add(`${f} -> ${m[1]}`);
  }
}
console.log(`checked ${n} internal links/assets across ${pages.length} pages; dead: ${dead.size}`);
dead.forEach((d) => console.log('DEAD', d));
console.log('external origins referenced:', [...ext].join(', ') || 'none');
process.exit(dead.size ? 1 : 0);
