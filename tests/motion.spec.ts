import { test, expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EVID = join(homedir(), 'projects/portfolio-rebuild/evidence/motion');
mkdirSync(EVID, { recursive: true });

// Waits until the globe chunk has loaded, the canvas has cross-faded in and the live loop has drawn.
async function ready(page: Page, live = true) {
  await page.goto('/');
  await page.waitForSelector('#hero-globe.on', { timeout: 15_000 });
  if (live) await page.waitForSelector('#hero-globe[data-mode="live"]', { timeout: 15_000 });
  else await page.waitForSelector('#hero-globe[data-ready="1"]');
  await page.waitForTimeout(700); // cross-fade (0.6s) finished
}

// Counts differing pixels between two PNG buffers of the same size.
function diff(a: Buffer, b: Buffer): number {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  expect(A.width).toBe(B.width); expect(A.height).toBe(B.height);
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 12) n++;
  }
  return n;
}
const shot = (page: Page) => page.locator('#hero-globe').screenshot();

async function rafCount(page: Page, ms = 2000) {
  await page.evaluate(() => {
    (window as any).__raf = 0;
    const o = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { (window as any).__raf++; return o(cb); };
  });
  await page.waitForTimeout(ms);
  return page.evaluate(() => (window as any).__raf as number);
}

test.describe('motion', () => {
  test('1. globe canvas exists and animates (screenshots 1s apart differ)', async ({ page }) => {
    await ready(page);
    await page.waitForTimeout(1500);
    const a = await shot(page); await page.waitForTimeout(1000); const b = await shot(page);
    writeFileSync(join(EVID, 'diff-live-a.png'), a); writeFileSync(join(EVID, 'diff-live-b.png'), b);
    const n = diff(a, b);
    console.log(`LIVE pixel diff: ${n}`);
    expect(await page.locator('canvas#hero-globe').count()).toBe(1);
    expect(await page.getAttribute('#hero-globe', 'aria-hidden')).toBe('true');
    expect(n).toBeGreaterThan(200);
  });

  test('2. reduced motion: screenshots identical, rAF loop not running', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'dark', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await ready(page, false);
    await page.waitForTimeout(1000);
    const a = await shot(page); await page.waitForTimeout(1000); const b = await shot(page);
    const n = diff(a, b);
    const raf = await rafCount(page);
    console.log(`REDUCED pixel diff: ${n}; rAF calls over 2s: ${raf}; mode=${await page.getAttribute('#hero-globe', 'data-mode')}`);
    expect(n).toBe(0);
    expect(raf).toBe(0);
    expect(await page.getAttribute('#hero-globe', 'data-mode')).toBe('static');
    // Static pose is India-centred and three static arcs show.
    expect(await page.getAttribute('#hero-globe', 'data-pose')).toBe('78.0,22.0');
    expect(await page.getAttribute('#hero-globe', 'data-arcs')).toBe('3');
    // Text appears instantly; indicator is not animating.
    const op = await page.evaluate(() => getComputedStyle(document.querySelector('.hero .hr')!).opacity);
    expect(op).toBe('1');
    await ctx.close();
  });

  test('3. pause control freezes the globe and survives a reload', async ({ page }) => {
    await ready(page);
    await page.waitForTimeout(1200);
    await page.click('#motion-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
    await page.waitForTimeout(300);
    const a = await shot(page); await page.waitForTimeout(1000); const b = await shot(page);
    const n = diff(a, b);
    const raf = await rafCount(page);
    console.log(`PAUSED pixel diff: ${n}; rAF calls over 2s: ${raf}`);
    expect(n).toBe(0);
    expect(raf).toBe(0);
    await page.reload();
    await page.waitForSelector('#hero-globe.on'); await page.waitForTimeout(700);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
    await expect(page.locator('#motion-toggle')).toHaveText('Resume animation');
    const c = await shot(page); await page.waitForTimeout(1000); const d = await shot(page);
    const n2 = diff(c, d);
    console.log(`PAUSED after reload pixel diff: ${n2}; rAF over 2s: ${await rafCount(page)}`);
    expect(n2).toBe(0);
    // Persisted on another page too.
    await page.goto('/about/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
    // Resume works.
    await page.goto('/'); await page.click('#motion-toggle');
    await page.waitForTimeout(800);
    const e = await shot(page); await page.waitForTimeout(1000); const f = await shot(page);
    expect(diff(e, f)).toBeGreaterThan(200);
  });

  test('4. globe chunk is not requested before first paint', async ({ page }) => {
    const reqs: { url: string; t: number }[] = [];
    const t0 = Date.now();
    page.on('request', (r) => reqs.push({ url: r.url(), t: Date.now() - t0 }));
    await page.addInitScript(() => {
      (window as any).__paint = {};
      new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as any).__paint[e.name] = e.startTime; }).observe({ type: 'paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as any).__paint.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto('/');
    await page.waitForSelector('#hero-globe[data-ready="1"]');
    const paint = await page.evaluate(() => (window as any).__paint);
    const globeReq = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\/(globe|earth|shared)\.[^/]*\.js$/.test(e.name)).map((e) => ({ n: e.name.split('/').pop(), start: Math.round(e.startTime) })));
    const fcp = paint['first-contentful-paint'];
    console.log(`FCP=${Math.round(fcp)}ms LCP=${Math.round(paint.lcp)}ms; lazy chunk starts: ${JSON.stringify(globeReq)}`);
    expect(fcp).toBeGreaterThan(0);
    expect(globeReq.length).toBeGreaterThan(0);
    for (const g of globeReq) expect(g.start).toBeGreaterThan(fcp);
    // And no globe chunk in the initial HTML.
    const html = await (await page.request.get('/')).text();
    expect(html).not.toMatch(/globe\.[\w-]+\.js|earth\.[\w-]+\.js|shared\.[\w-]+\.js/);
    expect(html).not.toMatch(/modulepreload/);
  });

  test('5. layout shift is zero while the canvas cross-fades in', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/');
    await page.waitForSelector('#hero-globe.on'); await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => (window as any).__cls);
    const img = await page.evaluate(() => { const i = document.querySelector('.hero-visual img') as HTMLImageElement; return { w: i.getAttribute('width'), h: i.getAttribute('height') }; });
    console.log(`CLS=${cls}; poster width/height attrs=${img.w}x${img.h}`);
    expect(img).toEqual({ w: '504', h: '360' });
    expect(cls).toBe(0);
  });

  test('6. globe settles India-centred in about 4s and drifts within 8 degrees', async ({ page }) => {
    const poses: { t: number; lon: number; lat: number; tt: number }[] = [];
    await page.goto('/');
    await page.waitForSelector('#hero-globe[data-mode="live"]', { timeout: 15_000 });
    const start = Date.now();
    for (let i = 0; i < 6; i++) {
      const [lon, lat] = (await page.getAttribute('#hero-globe', 'data-pose'))!.split(',').map(Number);
      const tt = Number(await page.getAttribute('#hero-globe', 'data-t'));
      poses.push({ t: Math.round(Date.now() - start), lon, lat, tt });
      await page.locator('#hero-visual').screenshot({ path: join(EVID, `globe-settle-${i + 1}.png`) });
      if (i < 5) await page.waitForTimeout(1000);
    }
    console.log('SETTLE frames (ms since first frame, lon, lat, scene t):', JSON.stringify(poses));
    // Sample 0 can be the pre-first-frame pose; sample 1 (~1.2s in) must still be in the wide view.
    expect(Math.abs(poses[1].lon - 78)).toBeGreaterThan(8);
    for (const p of poses.slice(1)) { if (p.tt >= 4) { expect(Math.abs(p.lon - 78)).toBeLessThanOrEqual(8); expect(Math.abs(p.lat - 22)).toBeLessThanOrEqual(8); } }
    // Long drift sample.
    let max = 0;
    for (let i = 0; i < 8; i++) { await page.waitForTimeout(500); const [lo, la] = (await page.getAttribute('#hero-globe', 'data-pose'))!.split(',').map(Number); max = Math.max(max, Math.abs(lo - 78), Math.abs(la - 22)); }
    console.log(`max drift sampled after settle: ${max.toFixed(2)} deg`);
    expect(max).toBeLessThanOrEqual(8);
  });

  test('7. pointer parallax tilts at most 6 degrees and springs back; off in reduced motion', async ({ page, browser }) => {
    await ready(page);
    await page.waitForTimeout(500);
    const box = (await page.locator('#hero-visual').boundingBox())!;
    await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2, { steps: 5 });
    await page.waitForTimeout(1500);
    const [tx, ty] = (await page.getAttribute('#hero-globe', 'data-tilt'))!.split(',').map(Number);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(2500);
    const [bx, by] = (await page.getAttribute('#hero-globe', 'data-tilt'))!.split(',').map(Number);
    console.log(`tilt at corner=(${tx},${ty}) after leave=(${bx},${by})`);
    expect(Math.hypot(tx, ty)).toBeGreaterThan(2);
    expect(Math.abs(tx)).toBeLessThanOrEqual(6); expect(Math.abs(ty)).toBeLessThanOrEqual(6);
    expect(Math.hypot(bx, by)).toBeLessThan(0.2);
    const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'dark', viewport: { width: 1440, height: 900 } });
    const p2 = await ctx.newPage(); await ready(p2, false);
    const bb = (await p2.locator('#hero-visual').boundingBox())!;
    await p2.mouse.move(bb.x + bb.width - 2, bb.y + bb.height - 2, { steps: 5 });
    await p2.waitForTimeout(500);
    expect(await p2.getAttribute('#hero-globe', 'data-tilt')).toBe('0.00,0.00');
    await ctx.close();
  });

  test('8. surface arcs: live set is 5-7 arcs at most, never labelled', async ({ page }) => {
    await ready(page);
    let seen = 0;
    for (let i = 0; i < 12; i++) { await page.waitForTimeout(700); seen = Math.max(seen, Number(await page.getAttribute('#hero-globe', 'data-arcs'))); }
    console.log(`max simultaneous arcs seen: ${seen}`);
    expect(seen).toBeGreaterThanOrEqual(3); expect(seen).toBeLessThanOrEqual(7);
  });

  test('9. hero text reveals in under 1.2s; instant with reduced motion', async ({ page, browser }) => {
    await page.goto('/');
    const t = await page.evaluate(async () => {
      const anims = document.getAnimations().filter((a) => (a as CSSAnimation).animationName === 'rise' || (a as CSSAnimation).animationName === 'fade');
      let end = 0;
      for (const a of anims) { const ct = a.effect!.getComputedTiming(); end = Math.max(end, (ct.delay as number) + (ct.duration as number)); }
      return { n: anims.length, endMs: end };
    });
    console.log(`hero text animations: ${t.n}, last ends at ${t.endMs}ms`);
    expect(t.n).toBeGreaterThan(0); expect(t.endMs).toBeLessThan(1200);
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const p = await ctx.newPage(); await p.goto('/');
    const s = await p.evaluate(() => ({ anims: document.getAnimations().length, tr: getComputedStyle(document.querySelector('.hero h1 .ln > span')!).transform, op: getComputedStyle(document.querySelector('.hero .hr')!).opacity }));
    console.log(`reduced hero text:`, JSON.stringify(s));
    expect(s.anims).toBe(0); expect(s.tr).toBe('none'); expect(s.op).toBe('1');
    await ctx.close();
  });

  test('10. bottom Earth: animates, rises with scroll, static when reduced, orbit satellite', async ({ page, browser }) => {
    await page.setViewportSize({ width: 1440, height: 500 });
    await page.goto('/');
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector('#earth.on[data-mode="live"]', { timeout: 15_000 });
    await page.waitForTimeout(800);
    const el = page.locator('#earth');
    const a = await el.screenshot(); await page.waitForTimeout(1500); const b = await el.screenshot();
    const n = diff(a, b);
    writeFileSync(join(EVID, 'earth-dark.png'), b);
    const sat = await page.getAttribute('#earth', 'data-sat');
    console.log(`EARTH live pixel diff: ${n}; satellite phase=${sat}; mode=${await page.getAttribute('#earth', 'data-mode')}`);
    expect(n).toBeGreaterThan(20); expect(sat).not.toBeNull();
    // Scroll parallax: limb apex moves with scroll position.
    const max = await page.evaluate(() => document.body.scrollHeight - innerHeight);
    await page.evaluate((m) => scrollTo(0, m - 150), max); await page.waitForTimeout(500);
    const ap1 = Number(await page.getAttribute('#earth', 'data-apex'));
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(500);
    const ap2 = Number(await page.getAttribute('#earth', 'data-apex'));
    console.log(`earth apex y at two scroll positions: ${ap1} -> ${ap2}`);
    expect(ap1).not.toBe(ap2);
    const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'dark', viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); await p.goto('/');
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await p.waitForSelector('#earth.on[data-ready="1"]', { timeout: 15_000 }); await p.waitForTimeout(700);
    const c = await p.locator('#earth').screenshot(); await p.waitForTimeout(1000); const d = await p.locator('#earth').screenshot();
    const raf = await rafCount(p);
    console.log(`EARTH reduced pixel diff: ${diff(c, d)}; rAF over 2s: ${raf}; mode=${await p.getAttribute('#earth', 'data-mode')}`);
    expect(diff(c, d)).toBe(0); expect(raf).toBe(0); expect(await p.getAttribute('#earth', 'data-mode')).toBe('static');
    await ctx.close();
  });

  test('11. theme toggle: light globe, ink dots on paper; 250ms colour transition; canvas recoloured', async ({ page }) => {
    await ready(page);
    await page.waitForTimeout(800);
    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(700);
    expect(Number(await page.getAttribute('#hero-globe', 'data-mix'))).toBe(1);
    const dur = await page.evaluate(() => getComputedStyle(document.body).transitionDuration);
    console.log(`body transition-duration=${dur}`);
    expect(dur).toContain('0.25s');
    await page.locator('#hero-visual').screenshot({ path: join(EVID, 'hero-light-visual.png') });
    await page.screenshot({ path: join(EVID, 'hero-light-1440.png') });
    const px = await page.evaluate(() => { const c = document.getElementById('hero-globe') as HTMLCanvasElement; const d = c.getContext('2d')!.getImageData(2, 2, 1, 1).data; return [d[0], d[1], d[2]]; });
    console.log(`light canvas corner pixel rgb=${px}`);
    expect(px[0]).toBeGreaterThan(200);
  });

  test('12. nav indicator slides; closing sweep and hairlines draw once; instant when reduced', async ({ page, browser }) => {
    await page.goto('/about/');
    await page.waitForTimeout(400);
    const x0 = await page.evaluate(() => (document.querySelector('.nav-ind') as HTMLElement).style.transform);
    await page.hover('nav a[href="/contact/"]'); await page.waitForTimeout(500);
    const x1 = await page.evaluate(() => (document.querySelector('.nav-ind') as HTMLElement).style.transform);
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.nav-ind')!).transitionDuration);
    console.log(`nav indicator ${x0} -> ${x1}, transition ${tr}`);
    expect(x0).not.toBe(x1); expect(tr).not.toBe('0s');
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(1500);
    const sweep = await page.evaluate(() => document.getAnimations().some((a) => (a as CSSAnimation).animationName === 'sweep') || document.querySelector('.closing')!.classList.contains('in'));
    const fh = await page.evaluate(() => getComputedStyle(document.querySelector('.site-footer.hl-line')!, '::after').transform);
    console.log(`closing in=${sweep}; footer hairline transform=${fh}`);
    expect(sweep).toBe(true); expect(fh).toMatch(/matrix\(1,/);
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const p = await ctx.newPage(); await p.goto('/about/');
    const r = await p.evaluate(() => ({
      anims: document.getAnimations().length,
      arc: getComputedStyle(document.querySelector('.m-arc')!).strokeDashoffset,
      node: getComputedStyle(document.querySelector('.m-node')!).opacity,
      h: getComputedStyle(document.querySelector('main h1')!).clipPath,
      line: getComputedStyle(document.querySelector('.site-header')!, '::after').transform,
      ind: getComputedStyle(document.querySelector('.nav-ind')!).transitionDuration,
      sweepDisplay: getComputedStyle(document.querySelector('.closing')!, '::after').display,
    }));
    console.log('reduced inner page:', JSON.stringify(r));
    expect(r.anims).toBe(0); expect(r.arc).toMatch(/^0(px)?$/); expect(r.node).toBe('1');
    expect(r.h).toMatch(/^(none|inset\(0px\))$/); expect(r.line).toMatch(/none|matrix\(1,/); expect(r.ind).toBe('0s'); expect(r.sweepDisplay).toBe('none');
    await ctx.close();
  });

  test('13. Save-Data or no canvas: poster only, no globe chunk requested', async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    const p = await ctx.newPage();
    const reqs: string[] = []; p.on('request', (r) => reqs.push(r.url()));
    await p.goto('/'); await p.waitForTimeout(2500);
    const js = reqs.filter((u) => /\/(globe|earth|shared)\.[^/]*\.js$/.test(u));
    console.log(`save-data: lazy chunks requested=${js.length}; canvas opacity=${await p.evaluate(() => getComputedStyle(document.getElementById('hero-globe')!).opacity)}`);
    expect(js).toHaveLength(0);
    await ctx.close();
  });

  test('14. no motion pause leakage: every page honours the pause state', async ({ page }) => {
    await page.goto('/');
    await page.click('#motion-toggle');
    for (const path of ['/', '/about/', '/projects/', '/architecture/', '/contact/']) {
      await page.goto(path);
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => ({ paused: document.documentElement.dataset.motion, running: document.getAnimations().filter((a) => a.playState === 'running' && !(a.effect as any)?.target?.matches?.('.nav-ind')).length }));
      console.log(`${path}: ${JSON.stringify(r)}`);
      expect(r.paused).toBe('paused'); expect(r.running).toBe(0);
    }
  });
});

test.describe('content stage', () => {
  test('15. expertise: one row open at a time, aria-expanded, lines to projects drawn', async ({ page }) => {
    await page.goto('/');
    const btns = page.locator('.exp-btn');
    expect(await btns.count()).toBe(4);
    const open = () => page.locator('.exp-btn[aria-expanded="true"]').count();
    expect(await open()).toBe(1);
    await btns.nth(2).scrollIntoViewIfNeeded();
    await btns.nth(2).click();
    expect(await open()).toBe(1);
    await expect(btns.nth(2)).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(1500);
    const lines = await page.locator('.exp-line').count();
    const offset = await page.evaluate(() => getComputedStyle(document.querySelector('.exp-line')!).strokeDashoffset);
    console.log(`expertise lines=${lines} dashoffset=${offset}`);
    expect(lines).toBe(4); // Enterprise Architecture is exercised in four projects
    expect(parseFloat(offset)).toBe(0);
    // keyboard: focus opens a row
    await btns.nth(3).focus();
    await expect(btns.nth(3)).toHaveAttribute('aria-expanded', 'true');
    expect(await open()).toBe(1);
  });

  test('15b. expertise lines are drawn instantly under reduced motion', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'dark', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({ n: document.querySelectorAll('.exp-line').length, off: getComputedStyle(document.querySelector('.exp-line')!).strokeDashoffset, tr: getComputedStyle(document.querySelector('.exp-line')!).transitionDuration }));
    console.log('reduced expertise', r);
    expect(r.n).toBeGreaterThan(0); expect(parseFloat(r.off)).toBe(0); expect(r.tr).toBe('0s');
    await ctx.close();
  });

  test('16. Athena packets move while visible, stop when paused or reduced', async ({ page, browser }) => {
    await page.goto('/');
    const fig = page.locator('.lead [data-flow]');
    await fig.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const pos = () => page.evaluate(() => [...document.querySelectorAll('.lead .fl-pkt')].map((c) => getComputedStyle(c).offsetDistance + '|' + getComputedStyle(c).opacity).join(','));
    const a = await pos(); await page.waitForTimeout(700); const b = await pos();
    console.log('packets', a.slice(0, 60), '->', b.slice(0, 60));
    expect(a).not.toBe(b);
    expect(await page.locator('.lead .fl-pkt').count()).toBeGreaterThan(8);
    await page.click('#motion-toggle');
    const c = await pos(); await page.waitForTimeout(500); const d = await pos();
    expect(c).toBe(d);
    const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'dark', viewport: { width: 1440, height: 900 } });
    const p2 = await ctx.newPage(); await p2.goto('/');
    await p2.locator('.lead [data-flow]').scrollIntoViewIfNeeded(); await p2.waitForTimeout(500);
    const vis = await p2.evaluate(() => getComputedStyle(document.querySelector('.lead .fl-pkt')!).display);
    expect(vis).toBe('none');
    await ctx.close();
  });

  test('17. architecture: play/pause button, notes on focus, all notes visible when reduced', async ({ page, browser }) => {
    await page.goto('/architecture/');
    const fig = page.locator('[data-flow]').first();
    await fig.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
    const btn = fig.locator('[data-flow-ctl]');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    const pos = () => fig.locator('.fl-pkt').first().evaluate((c) => getComputedStyle(c).offsetDistance);
    const a = await pos(); await page.waitForTimeout(600); const b = await pos();
    expect(a).not.toBe(b);
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(btn).toHaveText('Play flow');
    const c = await pos(); await page.waitForTimeout(500); const d = await pos();
    expect(c).toBe(d);
    await btn.click();
    await expect(btn).toHaveText('Pause flow');
    await fig.locator('.fl-node').nth(2).focus();
    await expect(fig.locator('[data-note-bar]')).toContainText('Policy, access control');
    expect(await page.locator('[data-flow]').count()).toBe(4);
    const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'dark', viewport: { width: 1440, height: 900 } });
    const p2 = await ctx.newPage(); await p2.goto('/architecture/');
    expect(await p2.locator('.flow-notes').first().isVisible()).toBe(true);
    await ctx.close();
  });

  test('18. project library filter works without reload and announces the count', async ({ page }) => {
    await page.goto('/projects/');
    const items = page.locator('.lib li:visible');
    expect(await items.count()).toBe(7);
    await page.evaluate(() => ((window as any).__marker = 1));
    await page.locator('[data-group="category"] .chip', { hasText: 'Agentic AI & MCP' }).click();
    expect(await items.count()).toBe(3);
    await expect(page.locator('[data-count]')).toHaveText('Showing 3 of 7 projects');
    await page.locator('[data-group="type"] .chip', { hasText: 'Prototype' }).click();
    expect(await items.count()).toBe(1);
    await expect(page.locator('[data-group="type"] .chip', { hasText: 'Prototype' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-group="type"] .chip', { hasText: /^All$/ })).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => (window as any).__marker)).toBe(1); // no reload
    expect(await page.locator('[data-count]').getAttribute('aria-live')).toBe('polite');
  });

  test('19. synthetic charts draw once in view; labelled illustrative; static when reduced', async ({ page, browser }) => {
    await page.goto('/projects/pfdf/');
    await page.locator('[data-chart]').scrollIntoViewIfNeeded(); await page.waitForTimeout(2800);
    await expect(page.locator('[data-chart]')).toContainText('Illustrative, synthetic data');
    const off = await page.evaluate(() => getComputedStyle(document.querySelector('.ch-a')!).strokeDashoffset);
    expect(parseFloat(off)).toBe(0);
    const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'dark', viewport: { width: 1440, height: 900 } });
    const p2 = await ctx.newPage(); await p2.goto('/projects/myinvs/');
    const r = await p2.evaluate(() => getComputedStyle(document.querySelector('.ch-a')!).strokeDasharray);
    expect(r).toBe('none');
    await ctx.close();
  });

  test('20. default theme is dark even for a light-OS visitor; toggle still works', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage(); await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await ctx.close();
  });
});
