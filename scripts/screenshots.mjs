// Screenshots of every built page in both themes at four widths. Usage: node scripts/screenshots.mjs [outDir] [route...]
import { chromium } from '@playwright/test';
import { readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';

const out = process.argv[2] || join(homedir(), 'projects/portfolio-rebuild/evidence/pages');
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
let routes = walk('dist').filter((f) => f.endsWith('index.html')).map((f) => '/' + f.slice(5, -10)).filter((r) => !r.startsWith('/_'));
// Redirect stubs are not pages.
routes = routes.filter((r) => !/\.html\/$/.test(r));
if (only.length) routes = routes.filter((r) => only.includes(r));
const shell = (() => { const root = join(homedir(), '.cache/ms-playwright'); for (const d of readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell-')).sort().reverse()) { const p = join(root, d, 'chrome-headless-shell-linux-arm64/chrome-headless-shell'); if (existsSync(p)) return p; } })();
const srv = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', '4330'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || shell });
try {
  for (const theme of ['dark', 'light']) for (const w of [360, 768, 1440, 1920]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
    const page = await ctx.newPage();
    for (const r of routes) {
      await page.goto(`http://127.0.0.1:4330${r}`);
      await page.waitForTimeout(400);
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
      await page.waitForTimeout(500);
      const name = (r === '/' ? 'home' : r.replace(/^\/|\/$/g, '').replace(/\//g, '-')) + `-${theme}-${w}.png`;
      await page.screenshot({ path: join(out, name), fullPage: true });
    }
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
console.log('screenshots:', routes.length, 'routes x 2 themes x 4 widths ->', out);
