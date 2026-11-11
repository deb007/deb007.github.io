// Measured layout checks on the built site: min font size, horizontal overflow, img dimensions, diagram labels.
import { chromium } from '@playwright/test';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path'; import { homedir } from 'node:os'; import { spawn } from 'node:child_process';
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const routes = walk('dist').filter((f) => f.endsWith('index.html')).map((f) => '/' + f.slice(5, -10)).filter((r) => !/\.html\/$/.test(r));
const root = join(homedir(), '.cache/ms-playwright'); let ex;
for (const d of readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell-'))) { const p = join(root, d, 'chrome-headless-shell-linux-arm64/chrome-headless-shell'); if (existsSync(p)) ex = p; }
const srv = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', '4331'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || ex });
let bad = 0, rows = 0;
for (const theme of ['dark', 'light']) for (const w of [360, 768, 1440, 1920]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto('http://127.0.0.1:4331' + r); await page.waitForTimeout(500);
    const res = await page.evaluate(() => {
      const small = [], svgSmall = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = n.textContent.trim(); if (!t) continue;
        const el = n.parentElement; if (!el || el.closest('script,style,noscript')) continue;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
        if (el.closest('.vh')) continue;
        let px = parseFloat(cs.fontSize);
        const svg = el.closest('svg');
        if (svg) { const s = svg.getBoundingClientRect().width / (svg.viewBox.baseVal.width || svg.getBoundingClientRect().width); px = px * s; if (px < 13) svgSmall.push(t.slice(0, 30) + ' ' + px.toFixed(2)); continue; }
        if (px < 13) small.push(t.slice(0, 30) + ' ' + px);
      }
      const imgs = [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).map((i) => i.src);
      const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const hidden = document.querySelectorAll('[data-flow].stacked').length;
      return { small, svgSmall, imgs, over, hidden, minDiag: [...document.querySelectorAll('[data-flow]:not(.stacked) svg text')].length };
    });
    rows++;
    if (res.small.length || res.svgSmall.length || res.imgs.length || res.over > 0) { bad++; console.log('FAIL', theme, w, r, JSON.stringify(res)); }
  }
  await ctx.close();
}
await b.close(); srv.kill();
console.log(`measured ${rows} page/theme/width combinations: ${bad} with a finding (text <13px, SVG label <13px effective, img without width/height, horizontal overflow)`);
process.exit(bad ? 1 : 0);
